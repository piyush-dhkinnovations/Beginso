import { Suspense } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { SignupForm } from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <AuthCard className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h2 className="text-heading-2 text-[var(--text-primary)]">Create an Account</h2>
        <p className="text-body-sm text-[var(--text-muted)]">
          Sign up to start setting up Beginso workflows
        </p>
      </div>

      {/* useSearchParams() (?next=, task 3.5) requires a Suspense boundary during prerender. */}
      <Suspense>
        <SignupForm />
      </Suspense>

      <div className="text-center text-body-sm text-[var(--text-muted)]">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-900 transition-colors">
          Log in
        </Link>
      </div>
    </AuthCard>
  );
}
