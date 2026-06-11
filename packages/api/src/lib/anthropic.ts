import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

/**
 * AI provider layer. Prefers Google Gemini (free tier, via its OpenAI-compatible
 * endpoint) when GEMINI_API_KEY is set; otherwise falls back to Anthropic Claude.
 * Public API (chat / structured / generateJobFromPrompt / tools / types) is stable
 * so routers never need to know which provider is active.
 */
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const useGemini = Boolean(GEMINI_KEY);

export const MODEL_FAST = useGemini
  ? (process.env.GEMINI_MODEL_FAST ?? 'gemini-2.5-flash')
  : (process.env.CLAUDE_MODEL_FAST ?? 'claude-haiku-4-5');
export const MODEL_SMART = useGemini
  ? (process.env.GEMINI_MODEL_SMART ?? 'gemini-2.5-flash')
  : (process.env.CLAUDE_MODEL_SMART ?? 'claude-sonnet-4-6');

let anthropic: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  if (anthropic) return anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');
  anthropic = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 4 });
  return anthropic;
}

let gemini: OpenAI | null = null;
function getGemini(): OpenAI {
  if (gemini) return gemini;
  gemini = new OpenAI({
    apiKey: GEMINI_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    timeout: 30_000,
    maxRetries: 1,
  });
  return gemini;
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

const textOf = (res: Anthropic.Message) =>
  res.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
    .trim();

/** Single chat turn (no streaming). */
export async function chat(
  system: string,
  messages: ChatMessage[],
  opts: { model?: string; maxTokens?: number } = {},
): Promise<string> {
  if (useGemini) {
    const res = await getGemini().chat.completions.create({
      model: opts.model ?? MODEL_SMART,
      max_tokens: opts.maxTokens ?? 1024,
      messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
    });
    return res.choices[0]?.message?.content?.trim() ?? '';
  }
  const res = await getAnthropic().messages.create({
    model: opts.model ?? MODEL_SMART,
    max_tokens: opts.maxTokens ?? 1024,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  return textOf(res);
}

/** Force a single structured (tool/function) call and return the validated object. */
export async function structured<T>(
  system: string,
  userContent: string,
  tool: Anthropic.Tool,
  opts: { model?: string; maxTokens?: number } = {},
): Promise<T> {
  if (useGemini) {
    const res = await getGemini().chat.completions.create({
      model: opts.model ?? MODEL_SMART,
      max_tokens: opts.maxTokens ?? 1200,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema as Record<string, unknown>,
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: tool.name } },
    });
    const call = res.choices[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error(`AI did not return ${tool.name}.`);
    return JSON.parse(call.function.arguments) as T;
  }

  const res = await getAnthropic().messages.create({
    model: opts.model ?? MODEL_SMART,
    max_tokens: opts.maxTokens ?? 1200,
    system,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [{ role: 'user', content: userContent }],
  });
  const toolUse = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
  if (!toolUse) throw new Error(`AI did not return ${tool.name}.`);
  return toolUse.input as T;
}

/**
 * Vision variant of structured(): extracts a tool-call from an image (or PDF) + instruction.
 * Supports image/jpeg|png|webp on both providers; application/pdf requires the Anthropic provider.
 */
export async function structuredFromImage<T>(
  system: string,
  instruction: string,
  imageBase64: string,
  mediaType: string,
  tool: Anthropic.Tool,
  opts: { model?: string; maxTokens?: number } = {},
): Promise<T> {
  const isPdf = mediaType === 'application/pdf';

  if (useGemini) {
    if (isPdf) throw new Error('PDF extraction requires the Anthropic provider. Upload a JPG or PNG instead.');
    const res = await getGemini().chat.completions.create({
      model: opts.model ?? MODEL_SMART,
      max_tokens: opts.maxTokens ?? 1500,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: instruction },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
          ],
        },
      ],
      tools: [{ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.input_schema as Record<string, unknown> } }],
      tool_choice: { type: 'function', function: { name: tool.name } },
    });
    const call = res.choices[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error(`AI did not return ${tool.name}.`);
    return JSON.parse(call.function.arguments) as T;
  }

  const fileBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } };
  const content = [fileBlock, { type: 'text', text: instruction }] as unknown as Anthropic.MessageParam['content'];

  const res = await getAnthropic().messages.create({
    model: opts.model ?? MODEL_SMART,
    max_tokens: opts.maxTokens ?? 1500,
    system,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [{ role: 'user', content }],
  });
  const toolUse = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
  if (!toolUse) throw new Error(`AI did not return ${tool.name}.`);
  return toolUse.input as T;
}

// ─── Structured job posting (AI Quick Post) ─────────────────────────
export type GeneratedJob = {
  title: string;
  description: string;
  categorySlug: string;
  emirateSlug: string;
  jobType: string;
  experienceLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: string[];
  benefits: string[];
  isRemote: boolean;
  isFresher: boolean;
};

const QUICK_POST_TOOL: Anthropic.Tool = {
  name: 'create_job_posting',
  description: 'Produce a structured UAE job posting from the employer prompt.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Concise job title' },
      description: { type: 'string', description: 'Markdown job description with responsibilities and requirements (150-400 words)' },
      categorySlug: { type: 'string', enum: ['it', 'healthcare', 'finance', 'sales', 'construction', 'hospitality', 'driving', 'education', 'admin', 'manufacturing', 'security', 'beauty'] },
      emirateSlug: { type: 'string', enum: ['dubai', 'abu-dhabi', 'sharjah', 'ajman', 'ras-al-khaimah', 'fujairah', 'umm-al-quwain'] },
      jobType: { type: 'string', enum: ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'freelance'] },
      experienceLevel: { type: 'string', enum: ['fresher', 'junior', '1-3-years', '3-5-years', '5-10-years', '10-plus-years'] },
      salaryMin: { type: 'integer', description: 'Monthly AED minimum (0 if unknown)' },
      salaryMax: { type: 'integer', description: 'Monthly AED maximum (0 if unknown)' },
      skills: { type: 'array', items: { type: 'string' } },
      benefits: { type: 'array', items: { type: 'string' } },
      isRemote: { type: 'boolean' },
      isFresher: { type: 'boolean' },
    },
    required: ['title', 'description', 'categorySlug', 'emirateSlug', 'jobType', 'experienceLevel', 'salaryMin', 'salaryMax', 'skills', 'benefits', 'isRemote', 'isFresher'],
  },
};

/** Turn a one-line employer prompt into a structured job posting. */
export async function generateJobFromPrompt(prompt: string): Promise<GeneratedJob> {
  const input = await structured<GeneratedJob>(
    'You generate professional UAE job postings as structured data. Use realistic AED monthly salary ranges for the UAE market. Default location to Dubai if unspecified.',
    `Create a job posting from this brief: "${prompt}".`,
    QUICK_POST_TOOL,
    { model: MODEL_FAST, maxTokens: 1500 },
  );
  return {
    ...input,
    skills: input.skills ?? [],
    benefits: input.benefits ?? [],
    salaryMin: input.salaryMin ? input.salaryMin : null,
    salaryMax: input.salaryMax ? input.salaryMax : null,
  };
}

// ─── Tools + result types ───────────────────────────────────────────
export const MATCH_TOOL: Anthropic.Tool = {
  name: 'report_match',
  description: 'Score how well a candidate matches a job.',
  input_schema: {
    type: 'object',
    properties: {
      score: { type: 'integer', description: '0-100 overall fit' },
      verdict: { type: 'string', enum: ['strong', 'good', 'fair', 'weak'] },
      strengths: { type: 'array', items: { type: 'string' } },
      gaps: { type: 'array', items: { type: 'string' } },
      summary: { type: 'string' },
    },
    required: ['score', 'verdict', 'strengths', 'gaps', 'summary'],
  },
};

export const CV_TOOL: Anthropic.Tool = {
  name: 'report_cv',
  description: 'ATS-style analysis of a CV/resume.',
  input_schema: {
    type: 'object',
    properties: {
      atsScore: { type: 'integer', description: '0-100 ATS readiness' },
      summary: { type: 'string' },
      keywords: { type: 'array', items: { type: 'string' } },
      missingKeywords: { type: 'array', items: { type: 'string' } },
      improvements: { type: 'array', items: { type: 'string' } },
      formattingIssues: { type: 'array', items: { type: 'string' } },
    },
    required: ['atsScore', 'summary', 'keywords', 'missingKeywords', 'improvements', 'formattingIssues'],
  },
};

export type MatchResult = {
  score: number;
  verdict: 'strong' | 'good' | 'fair' | 'weak';
  strengths: string[];
  gaps: string[];
  summary: string;
};
export type CvResult = {
  atsScore: number;
  summary: string;
  keywords: string[];
  missingKeywords: string[];
  improvements: string[];
  formattingIssues: string[];
};

// ─── Admin job extraction (paste / url / quick-form) ────────────────
export type JobDraft = {
  title: string;
  company: string;
  emirate: string;
  area: string;
  categorySlug: string;
  jobType: string;
  salaryMin: number;
  salaryMax: number;
  visaProvided: boolean;
  accommodation: boolean;
  freshersWelcome: boolean;
  remote: boolean;
  urgent: boolean;
  freeZone: boolean;
  description: string;
  requirements: string;
  benefits: string[];
  tags: string[];
  contactWhatsapp: string;
  contactEmail: string;
  deadline: string;
  vacancies: number;
  confidence: Record<string, 'high' | 'medium' | 'low'>;
};

export const JOB_DRAFT_TOOL: Anthropic.Tool = {
  name: 'job_draft',
  description: 'Extract or generate a structured UAE job posting.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      company: { type: 'string', description: 'Hiring company name, or empty string if unknown' },
      emirate: { type: 'string', enum: ['dubai', 'abu-dhabi', 'sharjah', 'ajman', 'ras-al-khaimah', 'fujairah', 'umm-al-quwain'], description: 'UAE emirate slug — OMIT entirely if the location is not stated in the source. Do not guess or default to Dubai.' },
      area: { type: 'string' },
      categorySlug: { type: 'string', enum: ['it', 'healthcare', 'finance', 'sales', 'construction', 'hospitality', 'driving', 'education', 'admin', 'manufacturing', 'security', 'beauty'] },
      jobType: { type: 'string', enum: ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'freelance'] },
      salaryMin: { type: 'integer', description: 'Monthly AED minimum (0 if unstated)' },
      salaryMax: { type: 'integer', description: 'Monthly AED maximum (0 if unstated)' },
      visaProvided: { type: 'boolean' },
      accommodation: { type: 'boolean' },
      freshersWelcome: { type: 'boolean' },
      remote: { type: 'boolean' },
      urgent: { type: 'boolean' },
      freeZone: { type: 'boolean' },
      description: { type: 'string', description: 'Full job description in clean markdown' },
      requirements: { type: 'string' },
      benefits: { type: 'array', items: { type: 'string' } },
      tags: { type: 'array', items: { type: 'string' } },
      contactWhatsapp: { type: 'string', description: 'Contact WhatsApp/phone if present, else empty' },
      contactEmail: { type: 'string', description: 'Contact email for applications if present (patterns: an email address, "send CV to", "email:"), else empty' },
      deadline: { type: 'string', description: 'ISO date or empty string' },
      vacancies: { type: 'integer' },
      confidence: {
        type: 'object',
        description: 'Per-field confidence',
        properties: {
          title: { type: 'string', enum: ['high', 'medium', 'low'] },
          company: { type: 'string', enum: ['high', 'medium', 'low'] },
          emirate: { type: 'string', enum: ['high', 'medium', 'low'] },
          category: { type: 'string', enum: ['high', 'medium', 'low'] },
          salary: { type: 'string', enum: ['high', 'medium', 'low'] },
          jobType: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['title', 'company', 'emirate', 'category', 'salary', 'jobType'],
      },
    },
    required: ['title', 'company', 'area', 'categorySlug', 'jobType', 'salaryMin', 'salaryMax', 'visaProvided', 'accommodation', 'freshersWelcome', 'remote', 'urgent', 'freeZone', 'description', 'requirements', 'benefits', 'tags', 'contactWhatsapp', 'contactEmail', 'deadline', 'vacancies', 'confidence'],
  },
};
