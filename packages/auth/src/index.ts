import NextAuth, { type DefaultSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';
import LinkedIn from 'next-auth/providers/linkedin';
import Twitter from 'next-auth/providers/twitter';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens, securityLogs, jobseekerProfiles, eq } from '@ddots/db';
import { loginSchema, type UserRole } from '@ddots/shared';
import { verifyPassword } from './password';
import { decryptSecret, verifyTotp, consumeBackupCode } from './totp';

export * from './totp';

/** Which OAuth providers are actually configured — drives which social buttons render.
 *  Mirrors the conditional provider registration below (single source of truth for the UI). */
export const socialProviders = {
  google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  facebook: !!(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET),
  linkedin: !!(process.env.AUTH_LINKEDIN_ID && process.env.AUTH_LINKEDIN_SECRET),
  twitter: !!(process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET),
} as const;
export type SocialProvider = keyof typeof socialProviders;

/** Record a failed login (fail-open — never throws, never blocks sign-in). */
async function logFailedLogin(req: Request | undefined, reason: string): Promise<void> {
  try {
    const ip = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    await db.insert(securityLogs).values({ event: 'FAILED_LOGIN', ip, metadata: { reason }, severity: 'warn' });
  } catch { /* never block auth on logging failure */ }
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession['user'];
  }
  interface User {
    role?: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    // Extra OAuth providers register only when their credentials are configured — an
    // unconfigured provider must never reach NextAuth (it would break auth site-wide).
    ...(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET
      ? [Facebook({ clientId: process.env.AUTH_FACEBOOK_ID, clientSecret: process.env.AUTH_FACEBOOK_SECRET, allowDangerousEmailAccountLinking: true })]
      : []),
    ...(process.env.AUTH_LINKEDIN_ID && process.env.AUTH_LINKEDIN_SECRET
      ? [LinkedIn({ clientId: process.env.AUTH_LINKEDIN_ID, clientSecret: process.env.AUTH_LINKEDIN_SECRET, allowDangerousEmailAccountLinking: true })]
      : []),
    ...(process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET
      ? [Twitter({ clientId: process.env.AUTH_TWITTER_ID, clientSecret: process.env.AUTH_TWITTER_SECRET, allowDangerousEmailAccountLinking: true })]
      : []),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totp: { label: '2FA code', type: 'text' },
      },
      authorize: async (raw, request) => {
        const req = request as unknown as Request | undefined;
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) { await logFailedLogin(req, 'invalid_input'); return null; }
        const { email, password } = parsed.data;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!user || !user.passwordHash || user.isBanned) { await logFailedLogin(req, 'no_user_or_banned'); return null; }

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) { await logFailedLogin(req, 'bad_password'); return null; }

        // TOTP 2FA — only enforced for accounts that opted in (totpEnabled).
        // Accounts without 2FA are unaffected and log in exactly as before.
        if (user.totpEnabled && user.totpSecret) {
          const code = typeof raw.totp === 'string' ? raw.totp.trim() : '';
          if (!code) { await logFailedLogin(req, '2fa_required'); return null; }
          const secret = await decryptSecret(user.totpSecret);
          const totpOk = secret ? await verifyTotp(code, secret) : false;
          if (!totpOk) {
            // Allow a single-use backup code as fallback.
            const usedHash = await consumeBackupCode(code, user.totpBackupCodes ?? []);
            if (!usedHash) { await logFailedLogin(req, '2fa_invalid'); return null; }
            await db
              .update(users)
              .set({ totpBackupCodes: (user.totpBackupCodes ?? []).filter((h) => h !== usedHash) })
              .where(eq(users.id, user.id));
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role ?? 'jobseeker') as UserRole;
      }
      // Allow client-side session.update({ role }) after role changes.
      if (trigger === 'update' && session?.role) {
        token.role = session.role as UserRole;
      }
      // OAuth first sign-in: backfill role from DB.
      if (token.id && !token.role) {
        const dbUser = await db.query.users.findFirst({ where: eq(users.id, token.id) });
        token.role = (dbUser?.role ?? 'jobseeker') as UserRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
  events: {
    // On any sign-in (esp. first OAuth), ensure a jobseeker profile shell exists so the dashboard never hangs.
    // Runs only in the Node auth handler, never in edge middleware — safe to touch the DB here.
    async signIn({ user }) {
      if (!user?.id) return;
      await db
        .insert(jobseekerProfiles)
        .values({ userId: user.id })
        .onConflictDoNothing({ target: jobseekerProfiles.userId });
    },
  },
});
