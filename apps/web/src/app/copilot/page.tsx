'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Lightbulb, Plus, Loader2 } from 'lucide-react';
import { useFeatureFlag } from '@/context/FeatureFlagsContext';
import { useCopilotChat } from '@/lib/use-copilot-chat';
import { CopilotChat } from '@/components/copilot-chat';
import { trpc } from '@/trpc/react';

export default function CopilotPage() {
  const router = useRouter();
  const { status } = useSession();
  const flag = useFeatureFlag('ai_copilot');
  const chat = useCopilotChat();
  const list = trpc.copilot.listConversations.useQuery(undefined, { enabled: flag.enabled });

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?callbackUrl=/copilot');
  }, [status, router]);

  if (status === 'loading' || flag.loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>;
  }
  if (!flag.enabled) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center"><Lightbulb className="mx-auto h-10 w-10 text-navy-300" /><p className="mt-3 font-semibold text-navy-900">Career Copilot is not available yet.</p><p className="text-sm text-navy-700/60">Check back soon.</p></div>;
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-5xl">
      {/* Sidebar — hidden on mobile */}
      <aside className="hidden w-64 shrink-0 flex-col border-r p-3 sm:flex">
        <button onClick={chat.newChat} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"><Plus className="h-4 w-4" /> New chat</button>
        <p className="mt-4 text-xs font-semibold uppercase text-navy-700/40">Recent</p>
        <ul className="mt-1 space-y-1 overflow-y-auto">
          {(list.data ?? []).map((c) => (
            <li key={c.id}>
              <button onClick={() => chat.selectConversation(c.id)} className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-navy-50 ${chat.conversationId === c.id ? 'bg-teal-50 text-teal-800' : 'text-navy-700'}`}>
                {c.contextType} · {new Date(c.updatedAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}
              </button>
            </li>
          ))}
          {list.data?.length === 0 && <li className="px-2 text-xs text-navy-700/40">No conversations yet.</li>}
        </ul>
      </aside>

      <main className="min-w-0 flex-1"><CopilotChat chat={chat} /></main>
    </div>
  );
}
