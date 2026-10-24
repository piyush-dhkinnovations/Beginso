'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Globe, Maximize2 } from 'lucide-react';
import { bx, cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { domainOf, safeHttpUrl, signInService, urlSettings } from '@/lib/fieldDisplay';
import { responsesService } from '@/services/responses';
import type { FormField } from '@/types/form';

interface UrlAnswerProps {
  value: string;
  field?: FormField;
  scope: string;
  /** A small card for the Table layout: the same card as the List layout, in a small size (thumbnail or monogram, title, host, Open). */
  small?: boolean;
}

// Opens in a new tab with no opener and no referrer. The site is only ever LINKED — never framed or embedded —
// and the link is only built for a plain http(s) address (anything else is shown as inert text).
const LINK_PROPS = { target: '_blank', rel: 'noopener noreferrer nofollow', referrerPolicy: 'no-referrer' } as const;

// bx, not cn: cn (tailwind-merge) takes the design system's bg-body-sm text style for a background colour and drops bg-(--accent-soft).
function Monogram({ domain, className }: { domain: string; className?: string }) {
  return (
    <span aria-hidden="true" className={bx('flex shrink-0 items-center justify-center rounded-md bg-(--accent-soft) bg-body-sm font-semibold uppercase text-(--accent-soft-text)', className)}>
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
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (u.hostname === 'youtube.com' || u.hostname.endsWith('.youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      return u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? null;
    }
  } catch { /* ignore */ }
  return null;
}

function vimeoVideo(href: string): { id: string; hash?: string } | null {
  try {
    const u = new URL(href);
    if (u.hostname !== 'vimeo.com' && !u.hostname.endsWith('.vimeo.com')) return null;
    const match = u.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?/);
    // Vimeo's share links can carry the unlisted-video hash in the query string.
    // It must be forwarded to the player or Vimeo may show “video does not exist”.
    return match ? { id: match[1], hash: match[2] ?? u.searchParams.get('h') ?? undefined } : null;
  } catch { return null; }
}

/** Extract a Google Drive file ID from drive.google.com share/open/file URLs, or null. */
function googleDriveId(href: string): string | null {
  try {
    const u = new URL(href);
    if (u.hostname !== 'drive.google.com' && u.hostname !== 'docs.google.com') return null;
    // /file/d/{ID}/view  or  /open?id={ID}
    const fileMatch = u.pathname.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (fileMatch) return fileMatch[1];
    return u.searchParams.get('id');
  } catch { /* ignore */ }
  return null;
}

function RichPreview({ href, domain, service, scope, framed, size, ratio, small = false }: { href: string; domain: string; service: string | null; scope: string; framed: boolean; size: Settings['previewSize']; ratio: Settings['aspectRatio']; small?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  // A sign-in host would only return its login or error page, so it is never scraped.
  const { data, isLoading } = useQuery({
    queryKey: ['link-preview', href],
    queryFn: () => responsesService.getLinkPreview(href, scope),
    staleTime: 60 * 60_000,
    retry: false,
    enabled: !service,
  });

  const ytId = youtubeId(href);
  const vimeo = vimeoVideo(href);
  const videoEmbedUrl = ytId
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?autoplay=1&rel=0`
    : vimeo
      ? `https://player.vimeo.com/video/${encodeURIComponent(vimeo.id)}${vimeo.hash ? `?h=${encodeURIComponent(vimeo.hash)}&autoplay=1` : '?autoplay=1'}`
      : null;
  const videoName = ytId ? 'YouTube' : 'Vimeo';
  const openVideo = () => setVideoOpen(true);
  const driveId = googleDriveId(href);
  // Platform-specific thumbnail CDNs — used when the preview service returns no image
  const platformThumb = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : driveId
    ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w400`
    : undefined;

  // Only show title when it adds information beyond the domain (avoids duplicate text when preview fails)
  const title = service ? `${service} file` : data?.title && data.title !== domain ? data.title : null;
  const videoTitle = title ?? `${videoName} video`;
  const image = data?.image && !imageFailed ? data.image : (!imageFailed && platformThumb ? platformThumb : undefined);
  const stacked = framed && size === 'large';
  const thumb = thumbClass({ size, ratio }, framed);

  // The small card (Table layout): a thumbnail or monogram, the title and host, and Open. No full address line: it is in the link's title.
  if (small) {
    return (
      <>
      <div className="flex w-full max-w-md min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-(--border-default) bg-(--surface-card) p-2.5">
        {isLoading ? (
          <div aria-busy="true" className="size-12 shrink-0 animate-pulse rounded-md bg-(--bg-subtle)" />
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element -- third-party thumbnail, intentionally not routed through next/image
          videoEmbedUrl ? (
            <button type="button" onClick={openVideo} aria-label="Play video" className="relative size-12 shrink-0 overflow-hidden rounded-md">
              <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="size-full object-cover" />
              <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-black/30 text-white">▶</span>
            </button>
          ) : <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="size-12 shrink-0 rounded-md object-cover" />
        ) : videoEmbedUrl ? (
          <button type="button" onClick={openVideo} aria-label="Play video" className="group relative size-12 shrink-0 overflow-hidden rounded-md">
            <Monogram domain={domain} className="size-full" />
            <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-black/20 text-white transition-colors group-hover:bg-black/40"><span className="grid size-7 place-items-center rounded-full bg-black/65 text-sm">▶</span></span>
          </button>
        ) : (
          <Monogram domain={domain} className="size-12" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {title && <p className="truncate bg-body-sm font-semibold text-(--text-primary)">{title}</p>}
          <p className="truncate bg-caption text-(--text-muted)" title={href}>{domain}</p>
          <a {...LINK_PROPS} href={href} className="inline-flex w-fit items-center gap-1 bg-body-sm font-medium text-(--text-link) hover:underline">
            {service ? 'Opens in a new tab' : 'Open website'}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
      {videoEmbedUrl && <Modal isOpen={videoOpen} onClose={() => setVideoOpen(false)} title={videoTitle} description={domain} size="xl">
        <div ref={playerRef} className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16 / 9' }}>
          <iframe title={videoTitle} src={videoEmbedUrl} className="absolute inset-0 size-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => playerRef.current?.requestFullscreen?.()} className="inline-flex items-center gap-2 text-(--text-link) hover:underline"><Maximize2 size={16} aria-hidden="true" /> Full screen</button>
          <a {...LINK_PROPS} href={href} className="inline-flex items-center gap-1 text-(--text-link) hover:underline">Open on {videoName} <ExternalLink size={13} aria-hidden="true" /></a>
        </div>
      </Modal>}
      </>
    );
  }

  return (
    <div className={cn('flex min-w-0 overflow-hidden', stacked && 'flex-col', framed ? 'rounded-lg border border-(--border-default) bg-(--surface-card)' : 'gap-3')}>
      {isLoading ? (
        <div aria-busy="true" className={cn('animate-pulse bg-(--bg-subtle)', thumb, !stacked && framed && 'self-stretch')} />
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element -- third-party thumbnail, intentionally not routed through next/image
        videoEmbedUrl ? <button type="button" onClick={openVideo} aria-label="Play video" className={cn('group relative overflow-hidden bg-black', thumb, !stacked && framed && 'self-stretch')}>
          <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="size-full object-cover" />
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-black/20 text-white transition-colors group-hover:bg-black/40"><span className="grid size-12 place-items-center rounded-full bg-black/65 text-xl">▶</span></span>
        </button> : <img
          src={image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className={cn('object-cover', thumb)}
        />
      ) : videoEmbedUrl ? (
        <button type="button" onClick={openVideo} aria-label="Play video" className={cn('group relative shrink-0 overflow-hidden rounded-md', framed ? 'm-3 size-12' : 'size-14')}>
          <Monogram domain={domain} className="size-full" />
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-black/20 text-white transition-colors group-hover:bg-black/40"><span className="grid size-8 place-items-center rounded-full bg-black/65 text-base">▶</span></span>
        </button>
      ) : (
        <Monogram domain={domain} className={framed ? 'm-3 size-12' : 'size-14'} />
      )}
      <div className={cn('flex min-w-0 flex-1 flex-col justify-center gap-0.5', framed && 'p-3')}>
        {title && <p className="line-clamp-2 bg-body-sm font-semibold text-(--text-primary)">{title}</p>}
        <p className="truncate bg-caption text-(--text-muted)">{domain}</p>
        {videoEmbedUrl ? (
          <button type="button" onClick={openVideo} title={`Play ${videoName} video`} className="w-fit max-w-full truncate bg-caption text-left text-(--text-muted) hover:text-(--text-link) hover:underline">{href}</button>
        ) : (
          <p className="truncate bg-caption text-(--text-muted)" title={href}>{href}</p>
        )}
        <a {...LINK_PROPS} href={href} className="mt-1 inline-flex w-fit items-center gap-1 bg-body-sm font-medium text-(--text-link) hover:underline">
          {service ? 'Opens in a new tab' : 'Open website'}
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>
      {videoEmbedUrl && <Modal isOpen={videoOpen} onClose={() => setVideoOpen(false)} title={videoTitle} description={domain} size="xl">
        <div ref={playerRef} className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16 / 9' }}>
          <iframe title={videoTitle} src={videoEmbedUrl} className="absolute inset-0 size-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => playerRef.current?.requestFullscreen?.()} className="inline-flex items-center gap-2 text-(--text-link) hover:underline"><Maximize2 size={16} aria-hidden="true" /> Full screen</button>
          <a {...LINK_PROPS} href={href} className="inline-flex items-center gap-1 text-(--text-link) hover:underline">Open on {videoName} <ExternalLink size={13} aria-hidden="true" /></a>
        </div>
      </Modal>}
    </div>
  );
}

export function UrlAnswer({ value, field, scope, small = false }: UrlAnswerProps) {
  const url = safeHttpUrl(value);
  // Not a plain web address (should not happen — the form validates it): shown as text, never as a link.
  if (!url) return <span className="break-all">{value}</span>;

  const { style, display, previewSize, aspectRatio } = urlSettings(field);
  const domain = domainOf(url);
  const href = url.href;

  // The Table layout always gets the small card, whatever style the form's owner chose for this link question.
  if (small) return <RichPreview href={href} domain={domain} service={signInService(url)} scope={scope} framed size="small" ratio="1:1" small />;

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
