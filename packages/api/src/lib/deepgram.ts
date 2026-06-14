/**
 * Deepgram speech-to-text (REST, no SDK). Graceful: throws a clear error when
 * DEEPGRAM_API_KEY is unset so callers can hide voice features.
 * Audio is streamed straight to Deepgram and never written to disk/R2.
 */
const KEY = process.env.DEEPGRAM_API_KEY;

export function isDeepgramConfigured(): boolean {
  return !!KEY;
}

/** Transcribe an audio buffer. model nova-2, auto language detect, smart formatting. */
export async function transcribe(audio: ArrayBuffer | Buffer, contentType = 'audio/webm'): Promise<string> {
  if (!KEY) throw new Error('Voice features are disabled — DEEPGRAM_API_KEY not set.');
  const params = new URLSearchParams({ model: 'nova-2', smart_format: 'true', punctuate: 'true', detect_language: 'true' });
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: { Authorization: `Token ${KEY}`, 'Content-Type': contentType },
    body: audio instanceof Buffer ? new Uint8Array(audio) : new Uint8Array(audio),
  });
  if (!res.ok) throw new Error(`Deepgram error ${res.status}`);
  const json = (await res.json()) as { results?: { channels?: { alternatives?: { transcript?: string }[] }[] } };
  return json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? '';
}
