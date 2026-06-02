import 'server-only';
import { cache } from 'react';
import { createServerCaller } from '@ddots/api';

/**
 * Server-side tRPC caller for React Server Components.
 * `cache` dedupes the caller within a single request.
 */
export const getApi = cache(async () => createServerCaller());
