'use client';

import { useState } from 'react';
import { bx } from '@/lib/utils';
import { uploadSrc } from '@/lib/uploadSrc';

const SIZE = { sm: 'size-8 rounded', md: 'size-11 rounded-md' } as const;

/**
 * A workspace's own logo, or the BeginSo mark when it has none (or the image cannot load). The same two looks as the workspace switcher in
 * the sidebar, so a workspace is recognisable by its picture wherever it is listed.
 */
export function WorkspaceLogo({ logo, size = 'md', className }: { logo?: string | null; size?: keyof typeof SIZE; className?: string }) {
  const [failed, setFailed] = useState(false);
  // an uploaded logo is asked for through this site (/api/backend), like the sidebar switcher does; the raw address is blocked by the page's image policy
  const src = uploadSrc(logo);
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- uploaded workspace logo, served by the backend
      <img src={src} alt="" aria-hidden="true" onError={() => setFailed(true)} className={bx('shrink-0 object-contain', SIZE[size], className)} />
    );
  }
  return (
    <span aria-hidden="true" className={bx('flex shrink-0 items-center justify-center overflow-hidden border border-(--border-default) bg-(--surface-card)', SIZE[size], className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local brand mark */}
      <img src="/favicon.svg" alt="" className={size === 'md' ? 'size-6' : 'size-4'} />
    </span>
  );
}
