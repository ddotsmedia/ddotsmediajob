'use client';

import Link from 'next/link';
import { Bell, Check, Loader2 } from 'lucide-react';
import { timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const utils = trpc.useUtils();
  const list = trpc.notifications.list.useQuery();
  const refresh = () => {
    utils.notifications.list.invalidate();
    utils.notifications.unreadCount.invalidate();
  };
  const markAll = trpc.notifications.markAllRead.useMutation({ onSuccess: refresh });
  const markOne = trpc.notifications.markRead.useMutation({ onSuccess: refresh });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-navy-900">
          <Bell className="h-6 w-6 text-teal-500" /> Notifications
        </h1>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()}><Check /> Mark all read</Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white">
        {list.isLoading && <Loader2 className="m-6 animate-spin text-teal-500" />}
        {list.data?.length === 0 && <p className="p-12 text-center text-navy-700/60">No notifications yet.</p>}
        <div className="divide-y">
          {list.data?.map((n) => {
            const body = (
              <div className={cn('p-4', !n.isRead && 'bg-teal-50/40')} onClick={() => !n.isRead && markOne.mutate({ id: n.id })}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-navy-900">{n.title}</span>
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" />}
                </div>
                {n.body && <p className="text-sm text-navy-700/70">{n.body}</p>}
                <p className="mt-1 text-xs text-navy-700/40">{timeAgo(n.createdAt)}</p>
              </div>
            );
            return n.link ? <Link key={n.id} href={n.link}>{body}</Link> : <div key={n.id}>{body}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
