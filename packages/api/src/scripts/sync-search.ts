/** One-shot: (re)index all active jobs into Typesense. Run: pnpm search:sync */
import { db, jobs, eq } from '@ddots/db';
import { ensureJobsCollection, upsertJobDocument, jobToDocument } from '../lib/typesense';

async function main() {
  await ensureJobsCollection();
  const rows = await db.query.jobs.findMany({
    where: eq(jobs.status, 'active'),
    with: { company: { columns: { name: true } } },
  });
  let n = 0;
  for (const row of rows) {
    await upsertJobDocument(jobToDocument(row, row.company?.name));
    n++;
  }
  console.log(`✅ Indexed ${n} active jobs into Typesense.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
