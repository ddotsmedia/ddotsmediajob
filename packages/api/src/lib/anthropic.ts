import Anthropic from '@anthropic-ai/sdk';

export const MODEL_FAST = process.env.CLAUDE_MODEL_FAST ?? 'claude-haiku-4-5';
export const MODEL_SMART = process.env.CLAUDE_MODEL_SMART ?? 'claude-sonnet-4-6';

let anthropic: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (anthropic) return anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');
  anthropic = new Anthropic({ apiKey });
  return anthropic;
}

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
      description: {
        type: 'string',
        description: 'Markdown job description with responsibilities and requirements (150-400 words)',
      },
      categorySlug: {
        type: 'string',
        enum: ['it', 'healthcare', 'finance', 'sales', 'construction', 'hospitality', 'driving', 'education', 'admin', 'manufacturing', 'security', 'beauty'],
      },
      emirateSlug: {
        type: 'string',
        enum: ['dubai', 'abu-dhabi', 'sharjah', 'ajman', 'ras-al-khaimah', 'fujairah', 'umm-al-quwain'],
      },
      jobType: {
        type: 'string',
        enum: ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'freelance'],
      },
      experienceLevel: {
        type: 'string',
        enum: ['fresher', 'junior', '1-3-years', '3-5-years', '5-10-years', '10-plus-years'],
      },
      salaryMin: { type: ['integer', 'null'], description: 'Monthly AED minimum, or null' },
      salaryMax: { type: ['integer', 'null'], description: 'Monthly AED maximum, or null' },
      skills: { type: 'array', items: { type: 'string' }, maxItems: 12 },
      benefits: { type: 'array', items: { type: 'string' }, maxItems: 10 },
      isRemote: { type: 'boolean' },
      isFresher: { type: 'boolean' },
    },
    required: ['title', 'description', 'categorySlug', 'emirateSlug', 'jobType', 'experienceLevel', 'skills', 'benefits', 'isRemote', 'isFresher'],
  },
};

/** Turn a one-line employer prompt into a structured job posting (Claude Haiku). */
export async function generateJobFromPrompt(prompt: string): Promise<GeneratedJob> {
  const res = await getAnthropic().messages.create({
    model: MODEL_FAST,
    max_tokens: 1500,
    tools: [QUICK_POST_TOOL],
    tool_choice: { type: 'tool', name: 'create_job_posting' },
    messages: [
      {
        role: 'user',
        content: `Create a professional UAE job posting from this brief: "${prompt}". Default location to Dubai if unspecified. Use realistic AED monthly salary ranges for the UAE market.`,
      },
    ],
  });

  const toolUse = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return a structured job posting.');
  const input = toolUse.input as GeneratedJob;
  return {
    ...input,
    skills: input.skills ?? [],
    benefits: input.benefits ?? [],
    salaryMin: input.salaryMin ?? null,
    salaryMax: input.salaryMax ?? null,
  };
}

// ─── Generic helpers (Phase 3 AI) ───────────────────────────────────
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

const textOf = (res: Anthropic.Message) =>
  res.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
    .trim();

/** Streaming-free chat turn. `system` is cached so multi-turn convos hit the prompt cache. */
export async function chat(
  system: string,
  messages: ChatMessage[],
  opts: { model?: string; maxTokens?: number } = {},
): Promise<string> {
  const res = await getAnthropic().messages.create({
    model: opts.model ?? MODEL_SMART,
    max_tokens: opts.maxTokens ?? 1024,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  return textOf(res);
}

/** Force a single structured tool call and return its typed input. */
export async function structured<T>(
  system: string,
  userContent: string,
  tool: Anthropic.Tool,
  opts: { model?: string; maxTokens?: number } = {},
): Promise<T> {
  const res = await getAnthropic().messages.create({
    model: opts.model ?? MODEL_SMART,
    max_tokens: opts.maxTokens ?? 1200,
    system,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [{ role: 'user', content: userContent }],
  });
  const toolUse = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
  if (!toolUse) throw new Error(`Claude did not return ${tool.name}.`);
  return toolUse.input as T;
}

export const MATCH_TOOL: Anthropic.Tool = {
  name: 'report_match',
  description: 'Score how well a candidate matches a job.',
  input_schema: {
    type: 'object',
    properties: {
      score: { type: 'integer', description: '0-100 overall fit' },
      verdict: { type: 'string', enum: ['strong', 'good', 'fair', 'weak'] },
      strengths: { type: 'array', items: { type: 'string' }, maxItems: 5 },
      gaps: { type: 'array', items: { type: 'string' }, maxItems: 5 },
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
      keywords: { type: 'array', items: { type: 'string' }, description: 'detected key skills' },
      missingKeywords: { type: 'array', items: { type: 'string' } },
      improvements: { type: 'array', items: { type: 'string' }, maxItems: 8 },
      formattingIssues: { type: 'array', items: { type: 'string' }, maxItems: 6 },
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
