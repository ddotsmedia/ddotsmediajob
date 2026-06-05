import { structured, MODEL_FAST } from '../anthropic';
import { wrapUserContent } from '../security';

export type ParsedJob = {
  title: string;
  company: string | null;
  category: string | null;
  emirate: string | null;
  salary_min: number | null;
  salary_max: number | null;
  job_type: string | null;
  visa_provided: boolean | null;
  accommodation: boolean | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  description: string | null;
  urgent: boolean;
};

const CATEGORIES = [
  'it', 'healthcare', 'finance', 'sales', 'construction', 'hospitality', 'driving',
  'teaching', 'engineering', 'hr', 'marketing', 'legal', 'fresher', 'remote', 'parttime', 'freelance',
];
const EMIRATES = ['dubai', 'abu-dhabi', 'sharjah', 'ajman', 'ras-al-khaimah', 'fujairah', 'umm-al-quwain'];
const JOB_TYPES = ['full-time', 'part-time', 'contract', 'freelance'];

const SYSTEM =
  'You are a UAE job posting parser. Extract job details from WhatsApp messages and call the parse_job tool. ' +
  'title is REQUIRED — if there is no clear job title, set title to an empty string. ' +
  'Salary is AED monthly: "4000-6000" → min 4000 max 6000; "5000" → min and max 5000; "4k" → 4000; ignore non-AED amounts. ' +
  'Emirate aliases: dxb→dubai, auh→abu-dhabi, shj→sharjah. ' +
  'urgent=true if the text contains urgent/asap/immediate/immediately. ' +
  'visa_provided=true if it mentions visa provided/visa available/company visa. ' +
  'accommodation=true if it mentions accommodation/housing/accom. ' +
  'contact_whatsapp: extract UAE mobile numbers (+971 or 05X). Use null for genuinely unknown fields — do not guess.';

const PARSE_TOOL = {
  name: 'parse_job',
  description: 'Structured UAE job details extracted from a WhatsApp message.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Job title; empty string if none found' },
      company: { type: ['string', 'null'] },
      category: { type: ['string', 'null'], enum: [...CATEGORIES, null] },
      emirate: { type: ['string', 'null'], enum: [...EMIRATES, null] },
      salary_min: { type: ['number', 'null'] },
      salary_max: { type: ['number', 'null'] },
      job_type: { type: ['string', 'null'], enum: [...JOB_TYPES, null] },
      visa_provided: { type: ['boolean', 'null'] },
      accommodation: { type: ['boolean', 'null'] },
      contact_whatsapp: { type: ['string', 'null'] },
      contact_email: { type: ['string', 'null'] },
      description: { type: ['string', 'null'] },
      urgent: { type: 'boolean' },
    },
    required: ['title', 'urgent'],
  },
};

/** Parse a free-text WhatsApp job message into structured fields. Returns null if no job title found. */
export async function parseJobMessage(text: string): Promise<ParsedJob | null> {
  try {
    const result = await structured<ParsedJob>(SYSTEM, wrapUserContent(text), PARSE_TOOL as never, {
      model: MODEL_FAST,
      maxTokens: 1200,
    });
    if (!result || !result.title || !result.title.trim()) return null;
    return {
      title: result.title.trim(),
      company: result.company ?? null,
      category: result.category ?? null,
      emirate: result.emirate ?? null,
      salary_min: result.salary_min ?? null,
      salary_max: result.salary_max ?? null,
      job_type: result.job_type ?? null,
      visa_provided: result.visa_provided ?? null,
      accommodation: result.accommodation ?? null,
      contact_whatsapp: result.contact_whatsapp ?? null,
      contact_email: result.contact_email ?? null,
      description: result.description ?? null,
      urgent: !!result.urgent,
    };
  } catch (err) {
    console.error('[wa parser]', err);
    return null;
  }
}
