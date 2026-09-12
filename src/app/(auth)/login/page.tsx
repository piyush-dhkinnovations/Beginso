import { Suspense } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthCard className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h2 className="text-heading-2 text-[var(--text-primary)]">Log In to Your Account</h2>
        <p className="text-body-sm text-[var(--text-muted)]">
          Enter your credentials to access the Beginso dashboard
        </p>
      </div>

      {/* useSearchParams() (?next=, task 3.5) requires a Suspense boundary during prerender. */}
      <Suspense>
        <LoginForm />
      </Suspense>

      <div className="flex flex-col gap-2 text-center text-body-sm text-[var(--text-muted)]">
        <div>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-brand-700 hover:text-brand-900 transition-colors">
            Sign up
          </Link>
        </div>
        <div>
          <Link href="/forgot-password" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            Forgot password?
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}
