import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
<<<<<<< Updated upstream
=======
import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { publicFormService } from '@/services/publicForm';
import { Button } from '@/components/ui/Button';
>>>>>>> Stashed changes

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ title?: string; message?: string }>;
}

export const metadata: Metadata = { title: 'Thank you!' };

export default async function SuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
<<<<<<< Updated upstream
  const { title, message } = await searchParams;
  const formTitle = title ? decodeURIComponent(title) : null;
  const successMessage = message
    ? decodeURIComponent(message)
    : 'Your response has been submitted successfully.';
=======
  const { title, message, embed, theme } = await searchParams;
  // PublicFormShell always sets ?title= when it routes here after a real submit. A bare visit (or a made-up slug) must
  // not claim success. ponytail: best-effort, a hand-built URL with a title for a real slug still renders.
  if (!title) redirect(`/f/${slug}`);
  const lookup = await publicFormService.getFormSchema(slug).then((r) => r, () => ({ schema: undefined, userNote: undefined }));
  // The schema is only used to tint the check. A form that stopped accepting responses the moment this one was
  // saved (response limit reached, closed mid-fill) has no public schema anymore, but the submit DID succeed, so
  // never replace the thank-you with "Form not found"; just fall back to the default tint.
  // The form's own colour tints the check, so the thank-you feels like part of the form that was just filled in.
  const brand = lookup.schema?.branding?.primaryColor;
  const tint = brand && HEX.test(brand) ? brand : '#1d4ed8';
  // Keep the embed frame's options when starting over inside it.
  const carried = new URLSearchParams();
  if (embed === '1') carried.set('embed', '1');
  if (theme === 'dark' || theme === 'auto') carried.set('theme', theme);
  const again = carried.size ? `/f/${slug}?${carried.toString()}` : `/f/${slug}`;
  const formTitle = decodeURIComponent(title);
  const successMessage = message ? decodeURIComponent(message) : 'Your response has been submitted successfully.';
>>>>>>> Stashed changes

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
