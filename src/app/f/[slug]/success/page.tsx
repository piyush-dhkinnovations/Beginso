import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { publicFormService } from '@/services/publicForm';
import { Button } from '@/components/ui/Button';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ title?: string; message?: string; embed?: string; theme?: string }>;
}

export const metadata: Metadata = { title: 'Thank you!' };

const HEX = /^#[0-9a-f]{6}$/i;

// Loose shapes drifting around the check, in the form's own colour.
const SPARKS = [
  { left: '4%', top: '18%', size: 10, delay: 700 },
  { left: '92%', top: '12%', size: 8, delay: 850 },
  { left: '14%', top: '82%', size: 7, delay: 1000 },
  { left: '88%', top: '78%', size: 12, delay: 780 },
  { left: '50%', top: '-6%', size: 6, delay: 920 },
];

export default async function SuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
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

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-4"
      style={{ backgroundImage: `radial-gradient(60rem 28rem at 50% 0%, color-mix(in srgb, ${tint} 14%, transparent), transparent)`, backgroundColor: 'var(--bg-subtle)' }}
    >
      <main className="aa-slide w-full max-w-md rounded-2xl border border-(--border-default) bg-(--surface-card) p-8 text-center shadow-(--shadow-lg) sm:p-10">
        {/* An animated check: a ring that pops in, then the tick drawing itself. */}
        <div className="relative mx-auto mb-6 size-24" aria-hidden="true">
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className="aa-pop absolute rounded-full"
              style={{ left: s.left, top: s.top, width: s.size, height: s.size, backgroundColor: tint, opacity: 0.55, animationDelay: `${s.delay}ms` }}
            />
          ))}
          <span className="aa-pop absolute inset-0 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${tint} 16%, transparent)` }} />
          <span className="aa-pop absolute inset-3 flex items-center justify-center rounded-full text-white shadow-(--shadow-md)" style={{ backgroundColor: tint, animationDelay: '120ms' }}>
            <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path className="aa-draw" d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        </div>

        <h1 className="bg-h2 mb-2 text-(--text-primary)">Thank you!</h1>
        <p className="bg-body mb-5 text-(--text-muted)">{successMessage}</p>

        <p className="mb-7 inline-flex max-w-full items-center gap-2 rounded-full border border-(--border-default) bg-(--bg-subtle) px-3.5 py-1.5 bg-body-sm text-(--text-secondary)">
          <FileText size={14} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{formTitle}</span>
        </p>

        <div>
          <Link href={again}>
            <Button variant="secondary">Submit another response</Button>
          </Link>
        </div>
      </main>

      {embed !== '1' && (
        <p className="m-0 bg-caption text-(--text-muted)">
          Made with{' '}
          <Link href="/" className="font-semibold text-(--text-secondary) hover:underline">
            Beginso
          </Link>
          {' · '}
          <Link href="/signup" className="hover:underline">
            Create your own form
          </Link>
        </p>
      )}
    </div>
  );
}
