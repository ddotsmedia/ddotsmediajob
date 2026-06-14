/**
 * Security event logging + IP blocking. FAIL-OPEN by design:
 *  - logging never throws and never blocks a request;
 *  - IP blocking only runs when ENABLE_IP_BLOCKING=true, and any Redis/DB error
 *    is treated as "not blocked" (the request continues).
 */
import { db, securityLogs, eq, and, gte, count, sql } from '@ddots/db';
import { getRedis } from './queue';

const BLOCKING_ON = process.env.ENABLE_IP_BLOCKING === 'true';
const AUTO_BLOCK_THRESHOLD = 50; // failed logins per IP per hour

export type SecurityEvent =
  | 'FAILED_LOGIN' | 'RATE_LIMIT_HIT' | 'IDOR_ATTEMPT' | 'ADMIN_ACTION'
  | 'WEBHOOK_RECEIVED' | 'SUSPICIOUS_UPLOAD' | 'IP_BLOCKED' | 'IP_UNBLOCKED';

type Severity = 'info' | 'warn' | 'error' | 'critical';

/** Write a security event. Never throws, never blocks. */
export async function logSecurityEvent(
  event: SecurityEvent,
  data: { userId?: string | null; ip?: string | null; userAgent?: string | null; metadata?: Record<string, unknown>; severity?: Severity } = {},
): Promise<void> {
  try {
    await db.insert(securityLogs).values({
      event,
      userId: data.userId ?? null,
      ip: data.ip?.slice(0, 64) ?? null,
      userAgent: data.userAgent?.slice(0, 400) ?? null,
      metadata: data.metadata,
      severity: data.severity ?? 'info',
    });
  } catch (err) {
    console.error('[security-log] write failed:', err instanceof Error ? err.message : err);
  }
}

/** True if the IP should be blocked. Fail-open: returns false on any error or when disabled. */
export async function isIpBlocked(ip: string | null | undefined): Promise<boolean> {
  if (!BLOCKING_ON || !ip || ip === 'unknown') return false;
  try {
    const redis = getRedis();
    if (await redis.exists(`blocked:ip:${ip}`)) return true;
    // Auto-block: 50+ failed logins from this IP in the last hour (DB-counted).
    const rows = await db
      .select({ n: count() })
      .from(securityLogs)
      .where(and(eq(securityLogs.event, 'FAILED_LOGIN'), eq(securityLogs.ip, ip), gte(securityLogs.createdAt, sql`now() - interval '1 hour'`)));
    return Number(rows[0]?.n ?? 0) >= AUTO_BLOCK_THRESHOLD;
  } catch {
    return false; // fail-open
  }
}

/** Manually block an IP (admin). No-op-safe on Redis failure. */
export async function blockIp(ip: string, ttlSec = 86_400, adminId?: string): Promise<void> {
  try { await getRedis().set(`blocked:ip:${ip}`, '1', 'EX', ttlSec); } catch (err) { console.error('[security-log] blockIp failed:', err instanceof Error ? err.message : err); }
  await logSecurityEvent('IP_BLOCKED', { ip, userId: adminId, severity: 'warn' });
}

export async function unblockIp(ip: string, adminId?: string): Promise<void> {
  try { await getRedis().del(`blocked:ip:${ip}`); } catch (err) { console.error('[security-log] unblockIp failed:', err instanceof Error ? err.message : err); }
  await logSecurityEvent('IP_UNBLOCKED', { ip, userId: adminId, severity: 'info' });
}

export const ipBlockingEnabled = BLOCKING_ON;
