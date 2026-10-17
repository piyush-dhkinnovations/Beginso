import { StateArt } from '@/components/illustrations/Illustration';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { publicFormService } from '@/services/publicForm';
import { PublicFormShell } from '@/components/public-form/PublicFormShell';
import { FormUnavailable } from '@/components/public-form/FormUnavailable';
import { RetryButton } from '@/components/public-form/RetryButton';
import { isPastCloseDate } from '@/lib/formAvailability';
import { UNAVAILABLE_COPY } from '@/lib/formUnavailable';
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
  const { schema, unavailable } = await publicFormService.getFormSchema(slug).catch(() => ({ schema: null, unavailable: undefined }));
  // A closed form is not a page to index or share, and its tab says why instead of a generic "Form".
  if (unavailable) return { title: UNAVAILABLE_COPY[unavailable].title, robots: { index: false, follow: false } };
  // The same for a closing date the page itself catches (the server had not said so yet): it was noindex in the body only after render.
  if (schema && isPastCloseDate(schema.settings.closeDate)) return { title: UNAVAILABLE_COPY.closeDate.title, robots: { index: false, follow: false } };
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
  const { schema, userNote, unavailable } = result;

  // The owner closed it, its closing date passed, or its limit was reached: say which.
  //
  // HTTP status, decided (QA D4-001): these pages answer 200 although the API says 410. A Next.js page can answer 404 (notFound())
  // but has no way to answer 410; the only route is the edge proxy asking the backend a second time on every public form view,
  // which is a real cost on the respondents' hot path for a cosmetic gain. What matters to a crawler is covered instead: the
  // title says why and the page is noindex (generateMetadata above). Draft, archived and unknown links stay a REAL 404.
  if (unavailable) return <FormUnavailable reason={unavailable} />;

  // Client-side courtesy only — the backend must independently reject submissions
  // (and ideally this GET too) past closeDate; this just avoids showing a stale form.
  if (schema && isPastCloseDate(schema.settings.closeDate)) {
    // `schema` loaded fine: its own settings.successMessage is the admin's custom message and takes priority.
    return <FormUnavailable reason="closeDate" userNote={schema.settings.successMessage} />;
  }

  // Draft, archived or a link that never existed: one indistinguishable screen, and a REAL 404 (it was a 200 page).
  if (!schema) {
    if (userNote) return <FormUnavailable userNote={userNote} />;
    notFound();
  }

  return <PublicFormShell schema={schema} slug={slug} search={search} />;
}
