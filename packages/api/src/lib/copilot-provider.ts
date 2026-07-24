import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropic } from './anthropic';
import { estimateCost, systemPrompt } from './copilot-prompts';

/**
 * AI Copilot chat via Anthropic Claude (Sonnet). Best-effort assistance — no accuracy
 * guarantees. Token/cost tracked like cv_ai_metrics. Only the last 10 turns are sent as context.
 */
export type CopilotMessage = { role: 'user' | 'assistant'; content: string };
export type CopilotResult = { assistantMessage: string; tokens_in: number; tokens_out: number; cost_usd: number; model: string };

export async function sendMessage(history: CopilotMessage[], userMessage: string, contextType: string): Promise<CopilotResult> {
  const model = process.env.CLAUDE_MODEL_SMART ?? 'claude-sonnet-4-6';
  const messages = [...history.slice(-10), { role: 'user' as const, content: userMessage }];
  const res = await getAnthropic().messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt(contextType),
    messages: messages as Anthropic.MessageParam[],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  const tin = res.usage.input_tokens;
  const tout = res.usage.output_tokens;
  return { assistantMessage: text || '(no response)', tokens_in: tin, tokens_out: tout, cost_usd: estimateCost(tin, tout), model };
}
