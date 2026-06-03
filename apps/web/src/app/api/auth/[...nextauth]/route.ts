import type { NextRequest } from 'next/server';
import { handlers } from '@ddots/auth';

// Explicit wrappers so the export types satisfy Next 15.5's route validator.
export function GET(req: NextRequest): Promise<Response> {
  return handlers.GET(req);
}
export function POST(req: NextRequest): Promise<Response> {
  return handlers.POST(req);
}
