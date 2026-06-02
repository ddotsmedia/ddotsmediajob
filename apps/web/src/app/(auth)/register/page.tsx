import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from './register-form';
import { Logo } from '@/components/logo';

export const metadata: Metadata = { title: 'Create Account', robots: { index: false, follow: true } };

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-navy-50/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-navy-900">Create your account</h1>
        <p className="mt-1 text-center text-sm text-navy-700/60">Join DdotsMediaJobs — it's free</p>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-navy-700/70">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-teal-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
