#!/usr/bin/env node
/**
 * Privacy regression guard: fails if any PUBLIC tRPC procedure exposes user email.
 *
 * User account email must stay admin-only (and the owning-employer applicants path).
 * This scans packages/api/src/routers/*.ts, tracks each procedure's access modifier,
 * and flags any `email`/`users.email` reference inside a `publicProcedure`.
 *
 * Run: node scripts/check-public-email.mjs   (wired into CI before build)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROUTERS = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'api', 'src', 'routers');
const PROC_RE = /^\s*(\w+):\s*(public|protected|employer|admin)Procedure\b/;
// Only flag email in OUTPUT projections: relational `email: true`, or `email: users.email`
// in a `.select({...})`. Filters like `eq(users.email, input)` are safe and ignored.
const EMAIL_RE = /\bemail:\s*true\b|\bemail:\s*users\.email\b/;

let violations = [];

for (const file of readdirSync(ROUTERS).filter((f) => f.endsWith('.ts'))) {
  const lines = readFileSync(join(ROUTERS, file), 'utf8').split('\n');
  let current = null; // { name, access, startLine }
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(PROC_RE);
    if (m) current = { name: m[1], access: m[2], line: i + 1 };
    if (current?.access === 'public' && EMAIL_RE.test(lines[i])) {
      violations.push(`${file}:${i + 1}  public procedure '${current.name}' exposes email -> ${lines[i].trim()}`);
    }
  }
}

if (violations.length) {
  console.error('✗ PRIVACY GUARD FAILED — user email must not be exposed by public procedures:\n');
  for (const v of violations) console.error('  ' + v);
  console.error('\nIf this is intentional, gate the procedure behind adminProcedure/ownership, or update this guard deliberately.');
  process.exit(1);
}
console.log('✓ privacy guard: no user email exposed by public procedures');
