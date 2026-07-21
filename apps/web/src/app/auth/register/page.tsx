import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterFlow } from './register-flow';

export const metadata: Metadata = { title: 'Create Account', robots: { index: false, follow: true } };

export default function AuthRegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-teal-50 via-white to-navy-100 px-4 py-10">
      <Suspense>
        <RegisterFlow />
      </Suspense>
    </div>
  );
}
