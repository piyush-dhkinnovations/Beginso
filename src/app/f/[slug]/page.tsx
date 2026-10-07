import { StateArt } from '@/components/illustrations/Illustration';
import type { Metadata, Viewport } from 'next';
import { publicFormService } from '@/services/publicForm';
import { PublicFormShell } from '@/components/public-form/PublicFormShell';
import { FormUnavailable } from '@/components/public-form/FormUnavailable';
import { RetryButton } from '@/components/public-form/RetryButton';
import { isPastCloseDate } from '@/lib/formAvailability';
import { AlertCircle } from 'lucide-react';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

export default async function PublicFormPage({ params, searchParams }: Props) {
  const { slug } = await params;
  // Embed options (cover, progress, title, theme, prefill[...]) travel in the query string; the shell parses them.
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) for (const one of Array.isArray(v) ? v : v === undefined ? [] : [v]) query.append(k, one);
  const search = query.toString();
  let result: Awaited<ReturnType<typeof publicFormService.getFormSchema>>;
  try {
    result = await publicFormService.getFormSchema(slug);
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--bg-subtle) p-4">
        <div role="alert" className="w-full max-w-md rounded-xl border border-(--border-default) bg-(--surface-card) p-8 text-center shadow-(--shadow-sm)">
          <StateArt
            name="error"
            size="sm"
            fallback={
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-(--error-surface) text-(--error-text)">
                <AlertCircle size={24} aria-hidden="true" />
              </span>
            }
          />
          <h1 className="mt-4 bg-h5 font-bold text-(--text-primary)">Unable to load this form</h1>
          <p className="mt-2 bg-body text-(--text-secondary)">
            The service is temporarily unavailable. Your form has not been removed or closed.
          </p>
          <RetryButton />
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
    return <FormUnavailable userNote={schema ? schema.settings.successMessage : userNote} notFound={!schema && !userNote} />;
  }

  return <PublicFormShell schema={schema} slug={slug} search={search} />;
}
