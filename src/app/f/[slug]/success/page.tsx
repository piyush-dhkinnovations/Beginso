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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-card p-8 max-w-[520px] w-full text-center">
        <CheckCircle2 size={64} className="text-success mx-auto mb-4" />
        <h1 className="text-display text-neutral-900 mb-2">Thank you!</h1>
        <p className="text-body text-neutral-500 mb-2">{successMessage}</p>
        {formTitle && (
          <p className="text-body-sm text-neutral-400 mb-6">{formTitle}</p>
        )}
        <Link
          href={`/f/${slug}`}
          className="text-body-sm text-brand-600 hover:text-brand-700 underline"
        >
          Submit another response
        </Link>
      </div>
    </div>
  );
}
