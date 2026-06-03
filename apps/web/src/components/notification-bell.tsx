'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Check } from 'lucide-react';
import { timeAgo } from '@ddots/shared';
import { trpc } from '@/trpc/react';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const unread = trpc.notifications.unreadCount.useQuery(undefined, { refetchInterval: 30_000 });
  const list = trpc.notifications.list.useQuery(undefined, { enabled: open });
  const markAll = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  const markOne = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const count = unread.data ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-navy-700 hover:bg-navy-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="font-display text-sm font-bold text-navy-900">Notifications</span>
              {count > 0 && (
                <button onClick={() => markAll.mutate()} className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline">
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {list.data?.length === 0 && <p className="p-6 text-center text-sm text-navy-700/50">No notifications yet.</p>}
              {list.data?.map((n) => {
                const inner = (
                  <div
                    className={cn('flex flex-col gap-0.5 border-b px-4 py-3 last:border-0 hover:bg-navy-50', !n.isRead && 'bg-teal-50/40')}
                    onClick={() => !n.isRead && markOne.mutate({ id: n.id })}
                  >
                    <span className="text-sm font-medium text-navy-900">{n.title}</span>
                    {n.body && <span className="text-xs text-navy-700/60">{n.body}</span>}
                    <span className="text-[10px] text-navy-700/40">{timeAgo(n.createdAt)}</span>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>{inner}</Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })}
            </div>
            <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t px-4 py-2.5 text-center text-xs font-semibold text-teal-600 hover:bg-navy-50">
              View all
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
