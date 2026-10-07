import { Suspense } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthCard className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="bg-h5 text-(--text-primary)">Log In to Your Account</h1>
        <p className="bg-body-sm text-(--text-muted)">
          Enter your credentials to access the Beginso dashboard
        </p>
      </div>

      {/* useSearchParams() (?next=, task 3.5) requires a Suspense boundary during prerender. */}
      <Suspense>
        <LoginForm />
      </Suspense>

      <div className="flex flex-col gap-2 text-center bg-body-sm text-(--text-muted)">
        <div>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-(--accent-soft-text) hover:text-(--accent-soft-text) transition-colors">
            Sign up
          </Link>
        </div>
        <div>
          <Link href="/forgot-password" className="text-(--text-muted) hover:text-(--text-primary) transition-colors">
            Forgot password?
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}
