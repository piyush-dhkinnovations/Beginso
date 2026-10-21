'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { domainOf, safeHttpUrl, signInService, urlSettings } from '@/lib/fieldDisplay';
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

/** Extract a YouTube video ID from any known YouTube URL form, or null. */
function youtubeId(href: string): string | null {
  try {
    const u = new URL(href);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null;
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch { /* ignore */ }
  return null;
}

/** Extract a Google Drive file ID from drive.google.com share/open/file URLs, or null. */
function googleDriveId(href: string): string | null {
  try {
    const u = new URL(href);
    if (!u.hostname.includes('drive.google.com') && !u.hostname.includes('docs.google.com')) return null;
    // /file/d/{ID}/view  or  /open?id={ID}
    const fileMatch = u.pathname.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (fileMatch) return fileMatch[1];
    return u.searchParams.get('id');
  } catch { /* ignore */ }
  return null;
}

function RichPreview({ href, domain, service, scope, framed, size, ratio }: { href: string; domain: string; service: string | null; scope: string; framed: boolean; size: Settings['previewSize']; ratio: Settings['aspectRatio'] }) {
  const [imageFailed, setImageFailed] = useState(false);
  // A sign-in host would only return its login or error page, so it is never scraped.
  const { data, isLoading } = useQuery({
    queryKey: ['link-preview', href],
    queryFn: () => responsesService.getLinkPreview(href, scope),
    staleTime: 60 * 60_000,
    retry: false,
    enabled: !service,
  });

  const ytId = youtubeId(href);
  const driveId = googleDriveId(href);
  // Platform-specific thumbnail CDNs — used when the preview service returns no image
  const platformThumb = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : driveId
    ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w400`
    : undefined;

  // Only show title when it adds information beyond the domain (avoids duplicate text when preview fails)
  const title = service ? `${service} file` : data?.title && data.title !== domain ? data.title : null;
  const image = data?.image && !imageFailed ? data.image : (!imageFailed && platformThumb ? platformThumb : undefined);
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
        <Monogram domain={domain} className={framed ? 'm-3 size-12' : 'size-14'} />
      )}
      <div className={cn('flex min-w-0 flex-1 flex-col justify-center gap-0.5', framed && 'p-3')}>
        {title && <p className="line-clamp-2 bg-body-sm font-semibold text-(--text-primary)">{title}</p>}
        <p className="truncate bg-caption text-(--text-muted)">{domain}</p>
        <p className="truncate bg-caption text-(--text-muted)" title={href}>{href}</p>
        <a {...LINK_PROPS} href={href} className="mt-1 inline-flex w-fit items-center gap-1 bg-body-sm font-medium text-(--text-link) hover:underline">
          {service ? 'Opens in a new tab' : 'Open website'}
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
        <span className="truncate bg-body-sm font-medium">{href}</span>
        <ExternalLink size={13} className="shrink-0 text-(--text-muted)" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  return <RichPreview href={href} domain={domain} service={signInService(url)} scope={scope} framed={display === 'card'} size={previewSize} ratio={aspectRatio} />;
}
