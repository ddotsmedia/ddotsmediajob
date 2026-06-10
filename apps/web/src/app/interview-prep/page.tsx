import type { Metadata } from 'next';
import Link from 'next/link';
import { Mic } from 'lucide-react';
import { auth } from '@ddots/auth';
import { Button } from '@/components/ui/button';
import { InterviewPrepTool } from './interview-prep-client';

export const metadata: Metadata = {
  title: { absolute: 'AI Interview Preparation UAE — Practice Free | DdotsMediaJobs' },
  description:
    'Prepare for UAE job interviews with AI. Role-specific questions, model answers, UAE workplace tips. Free AI interview coach.',
  alternates: { canonical: '/interview-prep' },
};

export default async function InterviewPrepPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center gap-2">
        <Mic className="h-6 w-6 text-teal-500" />
        <h1 className="font-display text-3xl font-bold text-navy-900">AI Interview Prep</h1>
      </div>
      <p className="mt-2 text-navy-700/70">
        Get a focused prep pack for your target role — likely questions, sample answers and tips tuned to the UAE market.
      </p>

      <div className="mt-8">
        {session?.user ? (
          <InterviewPrepTool />
        ) : (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="text-navy-700">Sign in to generate your interview prep pack — it's free.</p>
            <div className="mt-4 flex justify-center gap-3">
              <Button asChild>
                <Link href="/login?callbackUrl=/interview-prep">Log in</Link>
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
