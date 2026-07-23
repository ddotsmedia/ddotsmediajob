import Anthropic from '@anthropic-ai/sdk';
import { db, cvAiMetrics } from '@ddots/db';
import { getAnthropic } from './anthropic';

/**
 * Resume-parse provider abstraction (Phase 0). Cascade: Gemini Vision → Anthropic Claude →
 * local pdf-parse text heuristic. Each tier retries transient failures (3× exponential
 * backoff); a hard failure falls through to the next tier. Every attempt writes a row to
 * cv_ai_metrics (tokens + cost + latency). Never throws — worst case returns empty defaults.
 */

export type ParseResult = {
  skills: string[];
  experience_years: number;
  location: string[];
  education: string[];
  confidence: number; // 0..1
  model_used: 'gemini' | 'anthropic' | 'pdf-fallback' | 'none';
  tokens_used: number;
  cost_usd: number;
};

const PROMPT_VERSION = 'v1';
const MAX_BYTES = 15 * 1024 * 1024;
const RETRY_DELAYS = [100, 500, 2000]; // ms — 3 attempts per tier

// USD per 1M tokens (in, out). Override via env if pricing shifts.
const PRICE = {
  gemini: [Number(process.env.GEMINI_PRICE_IN ?? 0.075), Number(process.env.GEMINI_PRICE_OUT ?? 0.3)],
  anthropic: [Number(process.env.CLAUDE_PRICE_IN ?? 0.8), Number(process.env.CLAUDE_PRICE_OUT ?? 4)],
} as const;
const costOf = (tier: 'gemini' | 'anthropic', tin: number, tout: number) =>
  (tin * PRICE[tier][0] + tout * PRICE[tier][1]) / 1_000_000;

const GEMINI_MODEL = process.env.GEMINI_MODEL_FAST ?? 'gemini-2.5-flash';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL_FAST ?? 'claude-haiku-4-5';

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

const INSTRUCTION =
  'Extract from this CV/resume: skills (array of professional skills), experience (total years as a number), ' +
  'location (cities/countries array), education (degrees/schools array). Do not invent facts not in the document.';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const strArr = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim().slice(0, 80)).slice(0, max) : [];
const yrs = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, 0), 60) : 0);
const shape = (raw: { skills?: unknown; experience?: unknown; location?: unknown; education?: unknown }) => ({
  skills: strArr(raw.skills, 50),
  experience_years: yrs(raw.experience),
  location: strArr(raw.location, 10),
  education: strArr(raw.education, 10),
});

async function record(model: string, tin: number, tout: number, cost: number, latency: number, errorType: string | null) {
  try {
    await db.insert(cvAiMetrics).values({ model, promptVersion: PROMPT_VERSION, tokensIn: tin, tokensOut: tout, costUsd: cost, latencyMs: latency, errorType });
  } catch (e) {
    console.error('[ai-provider] metric insert failed:', e instanceof Error ? e.message : e);
  }
}

/** Retry a tier on transient errors (timeout / 429 / 5xx). Returns the value or throws the last error. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let i = 0; i <= RETRY_DELAYS.length; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      const transient = /timeout|abort|429|5\d\d|ECONNRESET|overloaded/i.test(msg);
      if (!transient || i === RETRY_DELAYS.length) throw e;
      await sleep(RETRY_DELAYS[i] ?? 0);
    }
  }
  throw last;
}

async function tryGemini(buf: Buffer, mime: string): Promise<Omit<ParseResult, 'confidence'>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('no gemini key');
  return withRetry(async () => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mime, data: buf.toString('base64') } }, { text: INSTRUCTION }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
      }),
    });
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('gemini empty');
    const tin = json.usageMetadata?.promptTokenCount ?? 0;
    const tout = json.usageMetadata?.candidatesTokenCount ?? 0;
    return { ...shape(JSON.parse(text)), model_used: 'gemini' as const, tokens_used: tin + tout, cost_usd: costOf('gemini', tin, tout) };
  });
}

async function tryAnthropic(buf: Buffer, mime: string): Promise<Omit<ParseResult, 'confidence'>> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('no anthropic key');
  const tool: Anthropic.Tool = {
    name: 'save_cv',
    description: 'Save structured CV metadata.',
    input_schema: { type: 'object', properties: { skills: { type: 'array', items: { type: 'string' } }, experience: { type: 'number' }, location: { type: 'array', items: { type: 'string' } }, education: { type: 'array', items: { type: 'string' } } }, required: ['skills', 'experience', 'location', 'education'] },
  };
  const fileBlock = mime === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } }
    : { type: 'image', source: { type: 'base64', media_type: mime, data: buf.toString('base64') } };
  return withRetry(async () => {
    const msg = await getAnthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: 'Extract structured data from CVs. Always use the tool. Never invent facts.',
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: INSTRUCTION }] as unknown as Anthropic.MessageParam['content'] }],
    });
    const block = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (!block) throw new Error('anthropic empty');
    const tin = msg.usage.input_tokens;
    const tout = msg.usage.output_tokens;
    return { ...shape(block.input as Record<string, unknown>), model_used: 'anthropic' as const, tokens_used: tin + tout, cost_usd: costOf('anthropic', tin, tout) };
  });
}

/** Last resort: local PDF text extraction + naive keyword heuristic. No AI, low confidence. */
async function tryPdfLocal(buf: Buffer, mime: string): Promise<Omit<ParseResult, 'confidence'>> {
  if (mime !== 'application/pdf') throw new Error('pdf-fallback: not a pdf');
  // Import the lib file directly — pdf-parse's index.js runs a debug harness that reads a
  // test fixture on require and crashes in bundled contexts.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error — deep import bypasses pdf-parse's crash-on-require debug harness; no bundled types
  const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default as (b: Buffer) => Promise<{ text: string }>;
  const { text } = await pdf(buf);
  const lower = text.toLowerCase();
  const KNOWN = ['javascript', 'typescript', 'python', 'java', 'react', 'node', 'sql', 'excel', 'photoshop', 'illustrator', 'autocad', 'sales', 'marketing', 'accounting', 'nursing', 'driving', 'cooking', 'welding', 'plumbing', 'electrical', 'customer service', 'html', 'css', 'aws', 'docker'];
  const skills = KNOWN.filter((k) => lower.includes(k)).map((k) => k.replace(/\b\w/g, (c) => c.toUpperCase()));
  const expMatch = lower.match(/(\d{1,2})\+?\s*years?/);
  return {
    skills: skills.slice(0, 50),
    experience_years: yrs(expMatch ? Number(expMatch[1]) : 0),
    location: [],
    education: /bachelor|master|diploma|degree|phd/i.test(text) ? ['(see CV)'] : [],
    model_used: 'pdf-fallback',
    tokens_used: 0,
    cost_usd: 0,
  };
}

export function mediaTypeFor(filename: string, contentType: string): string | null {
  const ct = (contentType ?? '').toLowerCase();
  const n = filename.toLowerCase();
  if (ct.includes('pdf') || n.endsWith('.pdf')) return 'application/pdf';
  if (ct.includes('png') || n.endsWith('.png')) return 'image/png';
  if (ct.includes('jpeg') || ct.includes('jpg') || /\.jpe?g$/.test(n)) return 'image/jpeg';
  return null;
}

const CONFIDENCE = { gemini: 0.92, anthropic: 0.88, 'pdf-fallback': 0.4, none: 0 } as const;

/** Parse a CV file through the provider cascade. Never throws. */
export async function parseResume(file: Buffer, filename: string, contentType = ''): Promise<ParseResult> {
  const empty: ParseResult = { skills: [], experience_years: 0, location: [], education: [], confidence: 0, model_used: 'none', tokens_used: 0, cost_usd: 0 };
  const mime = mediaTypeFor(filename, contentType) ?? (filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
  if (!mime || file.length === 0 || file.length > MAX_BYTES) return empty;

  const tiers: [string, () => Promise<Omit<ParseResult, 'confidence'>>][] = [
    ['gemini', () => tryGemini(file, mime)],
    ['anthropic', () => tryAnthropic(file, mime)],
    ['pdf-fallback', () => tryPdfLocal(file, mime)],
  ];

  let lastErr: string | null = null;
  for (const [tier, run] of tiers) {
    const t0 = Date.now();
    try {
      const r = await run();
      await record(r.model_used, 0, r.tokens_used, r.cost_usd, Date.now() - t0, null);
      return { ...r, confidence: CONFIDENCE[r.model_used] };
    } catch (e) {
      lastErr = e instanceof Error ? e.message.slice(0, 60) : 'error';
      await record(tier, 0, 0, 0, Date.now() - t0, lastErr);
      console.error(`[ai-provider] ${tier} failed:`, lastErr);
    }
  }
  return empty;
}
