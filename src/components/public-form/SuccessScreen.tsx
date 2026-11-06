import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { brandSuccess } from '@/lib/formTheme';
import { bx } from '@/lib/utils';
import type { FormBranding } from '@/types/form';
import { Confetti } from './Confetti';
import { SuccessRedirect } from './SuccessRedirect';

const HEX = /^#[0-9a-f]{6}$/i;

// Loose shapes drifting around the check, in the form's own colour.
const SPARKS = [
  { left: '4%', top: '18%', size: 10, delay: 700 },
  { left: '92%', top: '12%', size: 8, delay: 850 },
  { left: '14%', top: '82%', size: 7, delay: 1000 },
  { left: '88%', top: '78%', size: 12, delay: 780 },
  { left: '50%', top: '-6%', size: 6, delay: 920 },
];

export interface SuccessScreenProps {
  /** The form's name, shown in a chip. */
  title: string;
  /** The message from the form's settings (or the usual sentence). */
  message: string;
  /** The form's branding: the brand colour tints the check, and theme.success has the owner's own headline, picture, colour, confetti and redirect. */
  branding?: Pick<FormBranding, 'primaryColor' | 'theme'>;
  /** Where "Submit another response" goes. Null in the studio's preview, where it is only drawn. */
  again: string | null;
  /** Inside an embed there is no Beginso footer. */
  embed?: boolean;
  /** The Branding studio's preview: nothing moves on, and the page fills its frame instead of the window. */
  preview?: boolean;
}

/** The screen a respondent sees after sending: used by the real thank-you page and by the Branding studio's preview of it. */
export function SuccessScreen({ title, message, branding, again, embed, preview }: SuccessScreenProps) {
  const success = brandSuccess(branding ?? {});
  // The owner's accent colour, else the form's own colour, else blue. Only a hex ever reaches a style.
  const brand = branding?.primaryColor;
  const tint = success.colour ?? (brand && HEX.test(brand) ? brand : '#1d4ed8');

  return (
    <div
      className={bx('relative flex flex-col items-center justify-center gap-6 p-4', preview ? 'min-h-full' : 'min-h-screen')}
      style={{ backgroundImage: `radial-gradient(60rem 28rem at 50% 0%, color-mix(in srgb, ${tint} 14%, transparent), transparent)`, backgroundColor: 'var(--bg-subtle)' }}
    >
      {success.confetti && <Confetti colour={tint} />}
      <main className="aa-slide relative w-full max-w-md overflow-hidden rounded-2xl border border-(--border-default) bg-(--surface-card) text-center shadow-(--shadow-lg)">
        {success.picture && (
          // eslint-disable-next-line @next/next/no-img-element -- the owner's own picture (an upload, a built-in picture or an https address), nothing to optimise
          <img src={success.picture} alt="" className="h-40 w-full object-cover" />
        )}
        <div className="p-8 sm:p-10">
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

          <h1 className="bg-h2 mb-2 text-(--text-primary)">{success.headline ?? 'Thank you!'}</h1>
          <p className="bg-body mb-5 text-(--text-muted)">{message}</p>

          <p className="mb-7 inline-flex max-w-full items-center gap-2 rounded-full border border-(--border-default) bg-(--bg-subtle) px-3.5 py-1.5 bg-body-sm text-(--text-secondary)">
            <FileText size={14} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{title}</span>
          </p>

          {success.redirect && <SuccessRedirect url={success.redirect.url} seconds={success.redirect.seconds} preview={preview} />}

          <div>
            {again ? (
              <Link href={again}>
                <Button variant="secondary">Submit another response</Button>
              </Link>
            ) : (
              <Button variant="secondary" type="button" tabIndex={-1}>
                Submit another response
              </Button>
            )}
          </div>
        </div>
      </main>

      {embed !== true && !preview && (
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
