import { Suspense } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthCard className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="bg-h3 text-(--text-primary)">Log In to Your Account</h1>
        <p className="bg-body-sm text-(--text-muted)">
          Enter your credentials to access the Beginso dashboard
        </p>
      </div>

      {/* useSearchParams() (?next=, task 3.5) requires a Suspense boundary during prerender. */}
      <Suspense>
        <LoginForm />
      </Suspense>

      <div className="text-center bg-body-sm text-(--text-muted)">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold text-(--accent-soft-text) hover:text-(--accent-soft-text) transition-colors">
          Sign up
        </Link>
      </div>
    </AuthCard>
  );
}
