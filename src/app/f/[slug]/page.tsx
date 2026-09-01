import type { Metadata, Viewport } from 'next';
import { publicFormService } from '@/services/publicForm';
import { PublicFormShell } from '@/components/public-form/PublicFormShell';
import { FormUnavailable } from '@/components/public-form/FormUnavailable';
import { isPastCloseDate } from '@/lib/formAvailability';
import { AlertCircle } from 'lucide-react';

interface Props {
  params: Promise<{ slug: string }>;
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { schema } = await publicFormService.getFormSchema(slug).catch(() => ({ schema: null }));
  const description = schema?.pages?.[0]?.description;

  return {
    title: schema?.title ?? 'Form',
    description,
    openGraph: {
      title: schema?.title ?? 'Form',
      description,
    },
  };
}

export default async function PublicFormPage({ params }: Props) {
  const { slug } = await params;
  let result: Awaited<ReturnType<typeof publicFormService.getFormSchema>>;
  try {
    result = await publicFormService.getFormSchema(slug);
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
        <div role="alert" className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-card">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-error">
            <AlertCircle size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-heading-2 font-bold text-neutral-900">Unable to load this form</h1>
          <p className="mt-2 text-body text-neutral-600">
            The service is temporarily unavailable. Your form has not been removed or closed.
          </p>
          <a
            href={`/f/${encodeURIComponent(slug)}`}
            className="mt-6 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-slate-700 px-4 text-body-sm font-semibold text-white hover:bg-slate-900"
          >
            Try again
          </a>
        </div>
      </main>
    );
  }
  const { schema, userNote } = result;

  // Client-side courtesy only — the backend must independently reject submissions
  // (and ideally this GET too) past closeDate; this just avoids showing a stale form.
  if (!schema || isPastCloseDate(schema.settings.closeDate)) {
    // On the true-404 path, `schema` is null and `userNote` (if any) came from the
    // 404 response body. On the closeDate-detected-closed path, `schema` loaded fine —
    // its own settings.successMessage is the admin's custom message and takes priority.
    return <FormUnavailable userNote={schema ? schema.settings.successMessage : userNote} />;
  }

  return <PublicFormShell schema={schema} slug={slug} />;
}
