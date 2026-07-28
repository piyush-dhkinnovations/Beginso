import type { Metadata, Viewport } from 'next';
import { publicFormService } from '@/services/publicForm';
import { PublicFormShell } from '@/components/public-form/PublicFormShell';
import { FormUnavailable } from '@/components/public-form/FormUnavailable';
import { isPastCloseDate } from '@/lib/formAvailability';

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
  const { schema, userNote } = await publicFormService.getFormSchema(slug).catch(() => ({ schema: null, userNote: undefined }));

  // Client-side courtesy only — the backend must independently reject submissions
  // (and ideally this GET too) past closeDate; this just avoids showing a stale form.
  if (!schema || isPastCloseDate(schema.settings.closeDate)) {
    return <FormUnavailable userNote={userNote} />;
  }

  return <PublicFormShell schema={schema} slug={slug} />;
}
