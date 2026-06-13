'use client';

import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { trpc } from '@/trpc/react';
import { cn } from '@/lib/utils';

export function FollowCompanyButton({
  companyId,
  initialFollowing,
  followerCount,
}: {
  companyId: string;
  initialFollowing: boolean;
  followerCount: number;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(followerCount);
  const follow = trpc.content.followCompany.useMutation();
  const unfollow = trpc.content.unfollowCompany.useMutation();
  const pending = follow.isPending || unfollow.isPending;

  function toggle() {
    if (status !== 'authenticated') {
      router.push('/login');
      return;
    }
    if (following) {
      setFollowing(false);
      setCount((c) => Math.max(0, c - 1));
      unfollow.mutate({ companyId }, { onError: () => { setFollowing(true); setCount((c) => c + 1); toast.error('Could not unfollow'); } });
    } else {
      setFollowing(true);
      setCount((c) => c + 1);
      follow.mutate({ companyId }, { onError: () => { setFollowing(false); setCount((c) => Math.max(0, c - 1)); toast.error('Could not follow'); } });
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
        following ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-teal-500 text-white hover:bg-teal-400',
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={cn('h-4 w-4', following && 'fill-current')} />}
      {following ? 'Following' : 'Follow'}
      <span className="opacity-70">· {count}</span>
    </button>
  );
}
