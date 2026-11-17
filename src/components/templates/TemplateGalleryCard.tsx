'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { TemplateThumb, THUMB_ASPECT } from '@/components/templates/TemplateThumb';
import { usePublicTemplates } from '@/hooks/usePublicTemplates';
import { useTemplateHref, type GalleryCard } from '@/lib/templateGallery';

// A card in the public gallery. The whole card is one link to the template's page (a stretched link on the name), and two buttons sit above it:
// "Preview" (the same page) and "Use template". The buttons show on hover and on keyboard focus, and are always shown on a screen with no hover.
// Every card is the same height: the picture has one shape and the description is cut to two lines.

/** True once the element is within a screen's height of the viewport (always true where IntersectionObserver is missing). */
function useNearViewport<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  // Without IntersectionObserver (an old browser, the server) there is nothing to wait for. On the server the picture is a placeholder either way
  // (the full list is not loaded there), so the first paint is the same.
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near];
}

function Skeleton() {
  return <div aria-hidden="true" className="w-full animate-pulse bg-(--bg-subtle)" style={{ aspectRatio: THUMB_ASPECT }} />;
}

/** The form drawn from the full template. The full list is only asked for by a card that is drawing, and only once it is near the screen. */
function DrawnThumb({ slug }: { slug: string }) {
  const { data: templates } = usePublicTemplates();
  const template = templates?.find((t) => t.slug === slug || t._id === slug);
  return template ? <TemplateThumb template={template} /> : <Skeleton />;
}

function CardPicture({ card }: { card: GalleryCard }) {
  const [ref, near] = useNearViewport<HTMLDivElement>();
  if (card.thumbnail) {
    // A picture made ahead of time (one request, no drawing in the visitor's browser)
    // eslint-disable-next-line @next/next/no-img-element -- a fixed-size card picture served as a static file
    return <img src={card.thumbnail} alt={`Preview of the ${card.name} form`} loading="lazy" className="block w-full object-cover" style={{ aspectRatio: THUMB_ASPECT }} />;
  }
  return <div ref={ref}>{near ? <DrawnThumb slug={card.slug} /> : <Skeleton />}</div>;
}

export function TemplateGalleryCard({ card, signedIn }: { card: GalleryCard; signedIn: boolean }) {
  const detail = `/discover-templates/${encodeURIComponent(card.slug)}`;
  const minutes = card.estimatedMinutes;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-card) transition-shadow hover:shadow-(--shadow-md) focus-within:ring-2 focus-within:ring-(--border-focus)">
      <div className="relative">
        <CardPicture card={card} />
        {/* Above the stretched link (z-10). On hover or focus; on a touch screen, always. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-center gap-2 bg-linear-to-t from-black/45 to-transparent p-3 pt-10 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
          <ButtonLink href={detail} variant="secondary" size="small" className="min-h-11" aria-label={`Preview the ${card.name} template`}>
            Preview
          </ButtonLink>
          <ButtonLink href={useTemplateHref(card.slug, signedIn)} variant="primary" size="small" className="min-h-11" aria-label={`Use the ${card.name} template`}>
            Use template
          </ButtonLink>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="w-fit rounded-full bg-(--accent-soft) px-2.5 py-0.5 bg-caption font-medium text-(--accent-soft-text)">{card.category}</span>
        <h3 className="bg-h5 text-(--text-primary)">
          {/* the stretched link: the whole card is the click target */}
          <Link href={detail} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {card.name}
          </Link>
        </h3>
        <p className="bg-body-sm line-clamp-2 flex-1 text-(--text-secondary)">{card.description || 'A ready-made starting point you can customize.'}</p>
        <p className="flex items-center gap-1.5 bg-caption text-(--text-muted)">
          <span>
            {card.fieldCount} {card.fieldCount === 1 ? 'question' : 'questions'}
          </span>
          <span aria-hidden="true">·</span>
          <Clock size={12} aria-hidden="true" />
          <span>about {minutes} {minutes === 1 ? 'minute' : 'minutes'}</span>
        </p>
      </div>
    </article>
  );
}
