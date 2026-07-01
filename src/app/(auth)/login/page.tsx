import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <Card className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h2 className="text-heading-2 text-neutral-800">Log In to Your Account</h2>
        <p className="text-body-sm text-neutral-500">
          Enter your credentials to access the onboarding dashboard
        </p>
      </div>

      <LoginForm />

      <div className="flex flex-col gap-2 text-center text-body-sm text-neutral-500">
        <div>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-brand-700 hover:text-brand-900 transition-colors">
            Sign up
          </Link>
        </div>
        <div>
          <Link href="/forgot-password" className="text-neutral-400 hover:text-neutral-600 transition-colors">
            Forgot password?
          </Link>
        </div>
      </div>
    </Card>
  );
}
