import type { PublicFormBranding } from '@/types/publicForm';
import { safeHttpUrl } from '@/lib/fieldDisplay';

type Extras = Pick<PublicFormBranding, 'bannerText' | 'bannerLinks'>;

const validLinks = (b: Extras) =>
  (b.bannerLinks ?? []).flatMap((l) => {
    const url = safeHttpUrl(l.url);
    return url ? [{ href: url.href, text: l.label?.trim() || url.hostname }] : [];
  });

/** True when the owner added a line of text or a link to the form's header. */
export const hasBannerExtras = (b: Extras) => !!b.bannerText?.trim() || validLinks(b).length > 0;

/** The header's line of text and links, under the title. `onDark` is for text drawn over the brand colour or a cover. */
export function BannerExtras({ branding, onDark = false }: { branding: Extras; onDark?: boolean }) {
  const text = branding.bannerText?.trim();
  const links = validLinks(branding);
  if (!text && !links.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {text && <p className={`bg-body whitespace-pre-line ${onDark ? 'text-white/90' : 'text-(--text-secondary)'}`}>{text}</p>}
      {links.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {links.map((l, i) => (
            <a
              key={i}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`bg-body w-fit font-medium underline underline-offset-2 ${onDark ? 'text-white' : 'text-(--action-primary)'}`}
            >
              {l.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
