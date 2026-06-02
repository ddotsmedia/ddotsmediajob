import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// Reuse a single client across hot reloads in development.
const globalForDb = globalThis as unknown as { __ddotsPg?: ReturnType<typeof postgres> };

const client =
  globalForDb.__ddotsPg ??
  postgres(connectionString, {
    max: process.env.NODE_ENV === 'production' ? 20 : 5,
    prepare: false,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.__ddotsPg = client;

export const db = drizzle(client, { schema });
export type Database = typeof db;

export * from './schema';
export { schema };

// Re-export common drizzle-orm helpers so consumers import from one place.
export {
  eq,
  and,
  or,
  not,
  ne,
  gt,
  gte,
  lt,
  lte,
  like,
  ilike,
  inArray,
  isNull,
  isNotNull,
  desc,
  asc,
  sql,
  count,
  avg,
  sum,
} from 'drizzle-orm';
