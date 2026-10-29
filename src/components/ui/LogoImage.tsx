'use client';

import { useState } from 'react';
import { bx } from '@/lib/utils';
import { uploadSrc } from '@/lib/uploadSrc';

/**
 * An uploaded logo that never leaves a hole while it loads: a quiet tile holds its place (same size, so nothing jumps), the picture fades
 * in once it has arrived, and a picture that cannot be loaded leaves the tile instead of a broken-image mark. Give it a `key` of the
 * address so a different logo starts again.
 *
 * The corners are rounded in proportion to the logo (about a sixth of its width): a fixed 8px rounds a 24px logo into a circle and cuts the
 * corners off a wide one.
 */
export function LogoImage({ src, size, margin = 0, className }: { src: string; size: number; margin?: number; className?: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const radius = Math.max(3, Math.round(size / 6));
  return (
    <span aria-hidden="true" className={bx('relative inline-block flex-none', state !== 'ready' && 'animate-pulse bg-(--bg-sunken)', className)} style={{ width: size, height: size, margin, ...(state !== 'ready' ? { borderRadius: radius } : {}) }}>
      {state !== 'failed' && (
        // eslint-disable-next-line @next/next/no-img-element -- backend-served upload, not a static asset
        <img
          ref={(img) => {
            // a picture that was already in the browser's cache finished before React could listen
            if (img?.complete && img.naturalWidth > 0 && state === 'loading') setState('ready');
          }}
          src={uploadSrc(src)}
          alt=""
          decoding="async"
          onLoad={() => setState('ready')}
          onError={() => setState('failed')}
          style={{ borderRadius: radius }}
          className={bx('absolute inset-0 h-full w-full object-contain transition-opacity duration-200', state === 'ready' ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </span>
  );
}
