import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { publicFormService } from '@/services/publicForm';
import { SuccessScreen } from '@/components/public-form/SuccessScreen';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ title?: string; message?: string; embed?: string; theme?: string }>;
}

export const metadata: Metadata = { title: 'Thank you!' };

export default async function SuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { title, message, embed, theme } = await searchParams;
  // PublicFormShell always sets ?title= when it routes here after a real submit. A bare visit (or a made-up slug) must
  // not claim success. ponytail: best-effort, a hand-built URL with a title for a real slug still renders.
  if (!title) redirect(`/f/${slug}`);
  const lookup = await publicFormService.getFormSchema(slug).then((r) => r, () => ({ schema: undefined, userNote: undefined }));
  // The schema is only used for the form's own look (the tint of the check, and the owner's headline, picture, confetti and redirect from theme.success).
  // A form that stopped accepting responses the moment this one was saved (response limit reached, closed mid-fill) has no public schema anymore,
  // but the submit DID succeed, so never replace the thank-you with "Form not found"; just fall back to the default look.
  // Keep the embed frame's options when starting over inside it.
  const carried = new URLSearchParams();
  if (embed === '1') carried.set('embed', '1');
  if (theme === 'dark' || theme === 'auto') carried.set('theme', theme);
  const again = carried.size ? `/f/${slug}?${carried.toString()}` : `/f/${slug}`;

  return (
    <SuccessScreen
      title={decodeURIComponent(title)}
      message={message ? decodeURIComponent(message) : 'Your response has been submitted successfully.'}
      branding={lookup.schema?.branding}
      again={again}
      embed={embed === '1'}
    />
  );
}
