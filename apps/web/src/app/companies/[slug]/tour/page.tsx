import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { TRPCError } from '@trpc/server';
import { getApi } from '@/trpc/server';
import { OfficeTour } from './office-tour';

export const dynamic = 'force-dynamic';

async function load(slug: string) {
  try {
    const api = await getApi();
    return await api.content.companyBySlug({ slug });
  } catch (err) {
    if (err instanceof TRPCError && err.code === 'NOT_FOUND') return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  return { title: data ? `${data.company.name} — Virtual Office Tour` : 'Tour not found', robots: { index: false } };
}

export default async function CompanyTourPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data || !data.extras?.tourImageUrl) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href={`/companies/${slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to {data.company.name}
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-navy-900">Virtual office tour</h1>
      <p className="mt-1 text-sm text-navy-700/60">Drag to look around — or move your phone to explore in 360°.</p>
      <div className="mt-5">
        <OfficeTour image={data.extras.tourImageUrl} title={data.company.name} />
      </div>
    </div>
  );
}
