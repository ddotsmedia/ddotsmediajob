// The job lifecycle machine lives in @ddots/shared so the admin UI can offer
// only valid transitions using the same rules the server enforces.
// Re-exported here to keep existing `../lib/job-state-machine` importers working.
export {
  canTransition,
  allowedTransitions,
  isNoopTransition,
  timestampFieldFor,
} from '@ddots/shared';
export type { ActorRole } from '@ddots/shared';
