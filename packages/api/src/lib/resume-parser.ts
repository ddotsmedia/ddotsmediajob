/**
 * Resume → structured metadata for employer CV search (users.cv_metadata).
 * Uses the NATIVE Gemini Vision API (generateContent) — not the OpenAI-compat shim in
 * ./anthropic, which rejects PDFs. Native Gemini ingests PDFs as inline_data, and CVs
 * are overwhelmingly PDFs. Never throws: any failure returns empty defaults.
 */
export type CvMetadata = {
  skills: string[];
  experience: number;
  location: string[];
  education: string[];
};

export const EMPTY_CV_METADATA: CvMetadata = { skills: [], experience: 0, location: [], education: [] };

const MODEL = process.env.GEMINI_MODEL_FAST ?? 'gemini-2.5-flash';
const MAX_BYTES = 15 * 1024 * 1024; // Gemini inline_data cap headroom

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    skills: { type: 'ARRAY', items: { type: 'STRING' } },
    experience: { type: 'NUMBER' },
    location: { type: 'ARRAY', items: { type: 'STRING' } },
    education: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['skills', 'experience', 'location', 'education'],
} as const;

const PROMPT =
  'Extract JSON from this CV/resume with { skills: [array of professional skills], ' +
  'experience: total years of work experience (number), location: [cities/countries the ' +
  'candidate lives or has worked in], education: [degrees/schools] }. Do not invent facts ' +
  'that are not present in the document.';

const strArr = (v: unknown, max: number): string[] =>
  Array.isArray(v)
    ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim().slice(0, 80)).slice(0, max)
    : [];

function mediaTypeFor(url: string, contentType: string): string | null {
  const ct = contentType.toLowerCase();
  const lower = url.toLowerCase();
  if (ct.includes('pdf') || lower.includes('.pdf')) return 'application/pdf';
  if (ct.includes('png') || lower.endsWith('.png')) return 'image/png';
  if (ct.includes('jpeg') || ct.includes('jpg') || /\.jpe?g$/.test(lower)) return 'image/jpeg';
  if (ct.includes('webp') || lower.endsWith('.webp')) return 'image/webp';
  return null; // doc/docx etc. — not directly ingestible
}

export async function parseResume(pdfUrl: string): Promise<CvMetadata> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return EMPTY_CV_METADATA;

    const file = await fetch(pdfUrl, { signal: AbortSignal.timeout(15_000) });
    if (!file.ok) return EMPTY_CV_METADATA;

    const mimeType = mediaTypeFor(pdfUrl, file.headers.get('content-type') ?? '');
    if (!mimeType) return EMPTY_CV_METADATA;

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) return EMPTY_CV_METADATA;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: buf.toString('base64') } },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
        }),
      },
    );
    if (!res.ok) {
      console.error('[resume-parser] gemini HTTP', res.status);
      return EMPTY_CV_METADATA;
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return EMPTY_CV_METADATA;

    const raw = JSON.parse(text) as Partial<Record<keyof CvMetadata, unknown>>;
    return {
      skills: strArr(raw.skills, 50),
      experience: typeof raw.experience === 'number' && Number.isFinite(raw.experience) ? Math.min(Math.max(raw.experience, 0), 60) : 0,
      location: strArr(raw.location, 10),
      education: strArr(raw.education, 10),
    };
  } catch (err) {
    console.error('[resume-parser] failed:', err instanceof Error ? err.message : err);
    return EMPTY_CV_METADATA;
  }
}
