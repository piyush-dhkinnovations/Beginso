'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full p-8 flex flex-col items-center text-center gap-6">
      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-lg">
        ?
      </div>
      <div className="space-y-2">
        <h1 className="text-heading-2 font-bold text-neutral-900">Forgot Password</h1>
        <p className="text-body text-neutral-600">
          This page is scheduled for development in Sprint 2.
        </p>
      </div>
      <Link href="/login" className="w-full">
        <Button variant="secondary" className="w-full">
          Back to Login
        </Button>
      </Link>
    </Card>
  );
}
