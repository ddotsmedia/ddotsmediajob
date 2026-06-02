import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from './login-form';
import { Logo } from '@/components/logo';

export const metadata: Metadata = { title: 'Sign In', robots: { index: false, follow: true } };

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-navy-50/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-navy-900">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-navy-700/60">Sign in to continue to DdotsMediaJobs</p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-navy-700/70">
          New here?{' '}
          <Link href="/register" className="font-semibold text-teal-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
