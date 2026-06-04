import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { auth } from '@ddots/auth';
import { Button } from '@/components/ui/button';
import { CareerAdvisorChat } from './career-advisor-client';

export const metadata: Metadata = {
  title: 'AI Career Advisor — UAE Jobs, Visas & Salaries | DdotsMediaJobs',
  description:
    'Free AI career advisor for the UAE job market. Get localized advice on finding jobs in Dubai and Abu Dhabi, visa types, salary expectations in AED, and writing a UAE CV.',
  alternates: { canonical: '/career-advisor' },
};

export default async function CareerAdvisorPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-teal-500" />
        <h1 className="font-display text-3xl font-bold text-navy-900">AI Career Advisor</h1>
      </div>
      <p className="mt-2 text-navy-700/70">
        Practical, UAE-specific guidance on jobs, visas, salaries and CVs — powered by Claude.
      </p>

      <div className="mt-8">
        {session?.user ? (
          <CareerAdvisorChat />
        ) : (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="text-navy-700">Sign in to chat with your career advisor — it's free.</p>
            <div className="mt-4 flex justify-center gap-3">
              <Button asChild>
                <Link href="/login?callbackUrl=/career-advisor">Log in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register">Create free account</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
