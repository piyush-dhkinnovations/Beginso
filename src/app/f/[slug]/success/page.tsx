import { Illustration, hasIllustration } from '@/components/illustrations/Illustration';
import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ title?: string; message?: string }>;
}

export const metadata: Metadata = { title: 'Thank you!' };

export default async function SuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { title, message } = await searchParams;
  const formTitle = title ? decodeURIComponent(title) : null;
  const successMessage = message
    ? decodeURIComponent(message)
    : 'Your response has been submitted successfully.';

  return (
    <div className="min-h-screen bg-(--bg-subtle) flex items-center justify-center p-4">
      <div className="bg-(--surface-card) rounded-xl border border-(--border-default) shadow-(--shadow-sm) p-8 max-w-130 w-full text-center">
        {hasIllustration('success') ? (
          <Illustration name="success" className="mb-4" />
        ) : (
          <CheckCircle2 size={64} className="text-(--success-text) mx-auto mb-4" />
        )}
        <h1 className="bg-h3 text-(--text-primary) mb-2">Thank you!</h1>
        <p className="bg-body text-(--text-muted) mb-2">{successMessage}</p>
        {formTitle && (
          <p className="bg-body-sm text-(--text-disabled) mb-6">{formTitle}</p>
        )}
        <Link
          href={`/f/${slug}`}
          className="bg-body-sm text-(--text-link) hover:text-(--accent-soft-text) underline"
        >
          Submit another response
        </Link>
      </div>
    </div>
  );
}
