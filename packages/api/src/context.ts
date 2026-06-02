import { auth } from '@ddots/auth';
import { db } from '@ddots/db';

/**
 * tRPC request context. Created per-request.
 * `headers` is passed from the fetch adapter for IP / audit logging.
 */
export async function createContext(opts?: { headers?: Headers }) {
  const session = await auth();
  return {
    db,
    session,
    headers: opts?.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
