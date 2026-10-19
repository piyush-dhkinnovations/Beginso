'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { domainOf, safeHttpUrl, urlSettings } from '@/lib/fieldDisplay';
import { responsesService } from '@/services/responses';
import type { FormField } from '@/types/form';

interface UrlAnswerProps {
  value: string;
  field?: FormField;
  scope: string;
}

// Opens in a new tab with no opener and no referrer. The site is only ever LINKED — never framed or embedded —
// and the link is only built for a plain http(s) address (anything else is shown as inert text).
const LINK_PROPS = { target: '_blank', rel: 'noopener noreferrer nofollow', referrerPolicy: 'no-referrer' } as const;

function Monogram({ domain, className }: { domain: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center rounded-md bg-(--accent-soft) bg-body-sm font-semibold uppercase text-(--accent-soft-text)', className)}>
      {domain.charAt(0) || <Globe size={14} />}
    </span>
  );
}

type Settings = ReturnType<typeof urlSettings>;

// Thumbnail box per "Preview size" and "aspect ratio". Large stacks the image above the text; small and medium sit beside it.
function thumbClass({ size, ratio }: { size: Settings['previewSize']; ratio: Settings['aspectRatio'] }, framed: boolean): string {
  const shape = ratio === '16:9' ? 'aspect-video' : ratio === '1:1' ? 'aspect-square' : '';
  if (!framed) return cn('shrink-0 rounded-md', size === 'small' ? 'w-10' : size === 'large' ? 'w-24' : 'w-14', shape || 'aspect-square');
  if (size === 'large') return cn('w-full', shape || 'max-h-72 min-h-32');
  return cn('shrink-0', size === 'small' ? 'w-20' : 'w-28 sm:w-40', shape ? cn(shape, 'self-start') : 'min-h-20');
}

function RichPreview({ href, domain, scope, framed, size, ratio }: { href: string; domain: string; scope: string; framed: boolean; size: Settings['previewSize']; ratio: Settings['aspectRatio'] }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['link-preview', href],
    queryFn: () => responsesService.getLinkPreview(href, scope),
    staleTime: 60 * 60_000,
    retry: false,
  });

  const title = data?.title ?? domain;
  const image = data?.image && !imageFailed ? data.image : undefined;
  const stacked = framed && size === 'large';
  const thumb = thumbClass({ size, ratio }, framed);

  return (
    <div className={cn('flex min-w-0 overflow-hidden', stacked && 'flex-col', framed ? 'rounded-lg border border-(--border-default) bg-(--surface-card)' : 'gap-3')}>
      {isLoading ? (
        <div aria-busy="true" className={cn('animate-pulse bg-(--bg-subtle)', thumb, !stacked && framed && 'self-stretch')} />
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element -- third-party thumbnail, intentionally not routed through next/image
        <img
          src={image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className={cn('object-cover', thumb)}
        />
      ) : (
        <Monogram domain={domain} className={framed ? (stacked ? 'm-3 size-12' : 'm-3 size-12') : 'size-14'} />
      )}
      <div className={cn('flex min-w-0 flex-1 flex-col justify-center gap-0.5', framed && 'p-3')}>
        <p className="line-clamp-2 bg-body-sm font-semibold text-(--text-primary)">{title}</p>
        <p className="truncate bg-caption text-(--text-muted)">{domain}</p>
        <a {...LINK_PROPS} href={href} className="mt-1 inline-flex w-fit items-center gap-1 bg-body-sm font-medium text-(--text-link) hover:underline">
          Open website
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

export function UrlAnswer({ value, field, scope }: UrlAnswerProps) {
  const url = safeHttpUrl(value);
  // Not a plain web address (should not happen — the form validates it): shown as text, never as a link.
  if (!url) return <span className="break-all">{value}</span>;

  const { style, display, previewSize, aspectRatio } = urlSettings(field);
  const domain = domainOf(url);
  const href = url.href;

  if (style === 'text') {
    return (
      <a {...LINK_PROPS} href={href} className="inline-flex max-w-full items-center gap-1.5 text-(--text-link) hover:underline">
        <span className="break-all">{value}</span>
        <ExternalLink size={13} className="shrink-0" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  if (style === 'compact') {
    return (
      <a
        {...LINK_PROPS}
        href={href}
        title={href}
        className={cn(
          'inline-flex max-w-full items-center gap-2 text-(--text-primary) hover:text-(--text-link)',
          display === 'card' && 'rounded-lg border border-(--border-default) bg-(--surface-card) px-3 py-2'
        )}
      >
        <Monogram domain={domain} className="size-6" />
        <span className="truncate bg-body-sm font-medium">{domain}</span>
        <ExternalLink size={13} className="shrink-0 text-(--text-muted)" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  return <RichPreview href={href} domain={domain} scope={scope} framed={display === 'card'} size={previewSize} ratio={aspectRatio} />;
}
