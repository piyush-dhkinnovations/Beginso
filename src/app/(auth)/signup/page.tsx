import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { SignupForm } from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <Card className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h2 className="text-heading-2 text-neutral-800">Create an Account</h2>
        <p className="text-body-sm text-neutral-500">
          Sign up to start setting up Beginso workflows
        </p>
      </div>

      <SignupForm />

      <div className="text-center text-body-sm text-neutral-500">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-900 transition-colors">
          Log in
        </Link>
      </div>
    </Card>
  );
}
