/**
 * AI fallback chain for plain prompt → text calls.
 *   1. Anthropic Claude Haiku (primary)
 *   2. Groq Llama 3.3 70B (fallback)
 *   3. Google Gemini Flash 2.0 (second fallback)
 *
 * Each provider is tried in order; on 429/error we wait 1s and try the next.
 * The chosen provider is logged for analytics but never exposed to the user.
 * If every provider fails (or none is configured) we throw a generic error.
 */
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { franc } from 'franc';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

const HAIKU = process.env.CLAUDE_MODEL_FAST ?? 'claude-haiku-4-5';
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
const GEMINI_MODEL = process.env.GEMINI_MODEL_FAST ?? 'gemini-2.0-flash';

let anthropic: Anthropic | null = null;
let groq: OpenAI | null = null;
let gemini: OpenAI | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type PickAiOptions = { system?: string; maxTokens?: number; model?: string };
export type PickAiResult = { text: string; provider: 'anthropic' | 'groq' | 'gemini' };

async function viaAnthropic(prompt: string, o: PickAiOptions): Promise<string> {
  if (!ANTHROPIC_KEY) throw new Error('no-anthropic');
  anthropic ??= new Anthropic({ apiKey: ANTHROPIC_KEY, timeout: 30_000, maxRetries: 1 });
  const res = await anthropic.messages.create({
    model: o.model ?? HAIKU,
    max_tokens: o.maxTokens ?? 1024,
    system: o.system,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content.filter((c): c is Anthropic.TextBlock => c.type === 'text').map((c) => c.text).join('\n').trim();
}

async function viaOpenAICompat(client: OpenAI, model: string, prompt: string, o: PickAiOptions): Promise<string> {
  const res = await client.chat.completions.create({
    model,
    max_tokens: o.maxTokens ?? 1024,
    messages: [...(o.system ? [{ role: 'system' as const, content: o.system }] : []), { role: 'user' as const, content: prompt }],
  });
  return res.choices[0]?.message?.content?.trim() ?? '';
}

/** Run a prompt through the fallback chain. Returns text + which provider answered. */
export async function pickAI(prompt: string, opts: PickAiOptions = {}): Promise<PickAiResult> {
  const attempts: { name: PickAiResult['provider']; run: () => Promise<string> }[] = [];
  if (ANTHROPIC_KEY) attempts.push({ name: 'anthropic', run: () => viaAnthropic(prompt, opts) });
  if (GROQ_KEY) attempts.push({ name: 'groq', run: () => { groq ??= new OpenAI({ apiKey: GROQ_KEY, baseURL: 'https://api.groq.com/openai/v1', timeout: 30_000, maxRetries: 1 }); return viaOpenAICompat(groq, GROQ_MODEL, prompt, opts); } });
  if (GEMINI_KEY) attempts.push({ name: 'gemini', run: () => { gemini ??= new OpenAI({ apiKey: GEMINI_KEY, baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', timeout: 30_000, maxRetries: 1 }); return viaOpenAICompat(gemini, GEMINI_MODEL, prompt, opts); } });

  if (!attempts.length) throw new Error('AI temporarily unavailable');

  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i]!;
    try {
      const text = await a.run();
      if (text) {
        if (i > 0) console.log(`[ai-router] answered via fallback: ${a.name}`);
        return { text, provider: a.name };
      }
    } catch (err) {
      console.error(`[ai-router] ${a.name} failed:`, err instanceof Error ? err.message : err);
      if (i < attempts.length - 1) await sleep(1000);
    }
  }
  throw new Error('AI temporarily unavailable');
}

export type DetectedLang = 'ar' | 'en' | 'fil' | 'ur' | 'hi' | 'other';

const ISO_MAP: Record<string, DetectedLang> = { arb: 'ar', ara: 'ar', eng: 'en', tgl: 'fil', urd: 'ur', hin: 'hi' };

const hasArabic = (t: string) => /[؀-ۿ]/.test(t);

/** Lightweight language detection (no API). Falls back to 'other'. */
export function detectLanguage(text: string): DetectedLang {
  if (!text || text.trim().length < 10) return hasArabic(text) ? 'ar' : 'en';
  try {
    const code = franc(text, { minLength: 10 });
    return ISO_MAP[code] ?? (hasArabic(text) ? 'ar' : 'other');
  } catch {
    return hasArabic(text) ? 'ar' : 'other';
  }
}
