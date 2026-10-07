import { Suspense } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { SignupForm } from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <AuthCard className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h2 className="bg-h5 text-(--text-primary)">Create an Account</h2>
        <p className="bg-body-sm text-(--text-muted)">
          Sign up to start setting up Beginso workflows
        </p>
      </div>

      {/* useSearchParams() (?next=, task 3.5) requires a Suspense boundary during prerender. */}
      <Suspense>
        <SignupForm />
      </Suspense>

      <div className="text-center bg-body-sm text-(--text-muted)">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-(--accent-soft-text) hover:text-(--accent-soft-text) transition-colors">
          Log in
        </Link>
      </div>
    </AuthCard>
  );
}
