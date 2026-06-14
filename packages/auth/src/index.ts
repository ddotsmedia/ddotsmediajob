import NextAuth, { type DefaultSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens, securityLogs, eq } from '@ddots/db';
import { loginSchema, type UserRole } from '@ddots/shared';
import { verifyPassword } from './password';

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
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
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
});
