import { NextResponse } from 'next/server';
import { auth } from '@ddots/auth';
import { transcribe, isDeepgramConfigured } from '@ddots/api/lib/deepgram';
import { rateLimit } from '@ddots/api/lib/security';

export const runtime = 'nodejs';

/** Transcribe an uploaded audio clip (logged-in users only). Audio is never stored. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isDeepgramConfigured()) return NextResponse.json({ error: 'Voice features are not configured.' }, { status: 503 });

  const rl = await rateLimit(`voice:${session.user.id}`, 30, 3600);
  if (!rl.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const contentType = req.headers.get('content-type') ?? 'audio/webm';
  const buf = await req.arrayBuffer();
  if (buf.byteLength === 0 || buf.byteLength > 15 * 1024 * 1024) return NextResponse.json({ error: 'Invalid audio (max 15MB).' }, { status: 400 });
  try {
    const transcript = await transcribe(buf, contentType);
    return NextResponse.json({ transcript });
  } catch (err) {
    console.error('[voice]', err);
    return NextResponse.json({ error: 'Transcription failed.' }, { status: 500 });
  }
}
