import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropic } from './anthropic';

/**
 * Resume → structured metadata for employer CV search (users.cv_metadata).
 * Goes straight to Anthropic (Claude Haiku) because the Gemini OpenAI-compat layer
 * in ./anthropic cannot ingest PDFs — and CVs are overwhelmingly PDFs.
 * Never throws: any failure (fetch, unsupported type, AI error) returns empty defaults.
 */
export type CvMetadata = {
  skills: string[];
  experience: number;
  location: string[];
  education: string[];
};

export const EMPTY_CV_METADATA: CvMetadata = { skills: [], experience: 0, location: [], education: [] };

const MODEL = process.env.CLAUDE_MODEL_FAST ?? 'claude-haiku-4-5';
const MAX_BYTES = 8 * 1024 * 1024; // Claude document block limit headroom

const TOOL: Anthropic.Tool = {
  name: 'save_cv_metadata',
  description: 'Save structured metadata extracted from a CV/resume.',
  input_schema: {
    type: 'object',
    properties: {
      skills: { type: 'array', items: { type: 'string' }, description: 'Professional skills' },
      experience: { type: 'number', description: 'Total years of work experience' },
      location: { type: 'array', items: { type: 'string' }, description: 'Cities/countries the candidate lives or has worked in' },
      education: { type: 'array', items: { type: 'string' }, description: 'Degrees and schools' },
    },
    required: ['skills', 'experience', 'location', 'education'],
  },
};

const strArr = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim().slice(0, 80)).slice(0, max) : [];

export async function parseResume(pdfUrl: string): Promise<CvMetadata> {
  try {
    const res = await fetch(pdfUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return EMPTY_CV_METADATA;

    const ct = (res.headers.get('content-type') ?? '').toLowerCase();
    const lower = pdfUrl.toLowerCase();
    const mediaType = ct.includes('pdf') || lower.includes('.pdf')
      ? 'application/pdf'
      : ct.includes('png') || lower.endsWith('.png')
        ? 'image/png'
        : ct.includes('jpeg') || ct.includes('jpg') || /\.jpe?g$/.test(lower)
          ? 'image/jpeg'
          : null;
    if (!mediaType) return EMPTY_CV_METADATA; // doc/docx etc. — Claude document blocks are PDF-only

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) return EMPTY_CV_METADATA;

    const fileBlock =
      mediaType === 'application/pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } }
        : { type: 'image', source: { type: 'base64', media_type: mediaType, data: buf.toString('base64') } };

    const msg = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: 'You extract structured data from CVs/resumes. Always use the tool. Do not invent facts that are not in the document.',
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
      messages: [
        {
          role: 'user',
          content: [
            fileBlock,
            { type: 'text', text: 'Extract from this CV: skills (array), total experience in years (number), location (cities/countries array), education (degrees/schools array).' },
          ] as unknown as Anthropic.MessageParam['content'],
        },
      ],
    });

    const block = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const raw = (block?.input ?? {}) as Partial<Record<keyof CvMetadata, unknown>>;
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
