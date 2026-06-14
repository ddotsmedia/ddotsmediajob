import { Badge } from '@/components/ui/primitives';

const MAP: Record<string, { label: string; cls: string }> = {
  manual: { label: 'Manual', cls: 'bg-navy-100 text-navy-600' },
  admin_web: { label: 'Manual', cls: 'bg-navy-100 text-navy-600' },
  whapi: { label: 'WhatsApp', cls: 'bg-[#25D366]/15 text-[#1a8a4f]' },
  whatsapp: { label: 'WhatsApp', cls: 'bg-[#25D366]/15 text-[#1a8a4f]' },
  whatsapp_bot: { label: 'WhatsApp', cls: 'bg-[#25D366]/15 text-[#1a8a4f]' },
  telegram: { label: 'Telegram', cls: 'bg-sky-100 text-sky-700' },
  csv: { label: 'CSV', cls: 'bg-amber-100 text-amber-700' },
  paste: { label: 'Paste', cls: 'bg-purple-100 text-purple-700' },
  quick: { label: 'Quick', cls: 'bg-purple-100 text-purple-700' },
  url: { label: 'URL', cls: 'bg-purple-100 text-purple-700' },
  email: { label: 'Email', cls: 'bg-blue-100 text-blue-700' },
  community: { label: 'Community', cls: 'bg-amber-100 text-amber-700' },
};

export function SourceBadge({ source }: { source: string | null | undefined }) {
  const s = MAP[source ?? 'manual'] ?? { label: source ?? 'Manual', cls: 'bg-navy-100 text-navy-600' };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${s.cls}`}>{s.label}</span>;
}

// Re-export for callers that only need the Badge primitive nearby.
export { Badge };
