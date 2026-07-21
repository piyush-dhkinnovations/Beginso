import type { Metadata, Viewport } from 'next';
import { publicFormService } from '@/services/publicForm';
import { PublicFormShell } from '@/components/public-form/PublicFormShell';
import { FormUnavailable } from '@/components/public-form/FormUnavailable';

interface Props {
  params: Promise<{ slug: string }>;
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const schema = await publicFormService.getFormSchema(slug).catch(() => null);
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
  const schema = await publicFormService.getFormSchema(slug).catch(() => null);

  if (!schema) {
    return <FormUnavailable />;
  }

  return <PublicFormShell schema={schema} slug={slug} />;
}
