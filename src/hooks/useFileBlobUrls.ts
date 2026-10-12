'use client';

import { useEffect, useState } from 'react';
import { responsesService } from '@/services/responses';

export type BlobUrlState = { status: 'loading' } | { status: 'ready'; url: string } | { status: 'error' };

/**
 * Loads response files (through the same-origin proxy, which carries the session) as local blob: URLs an
 * <img> can use, and revokes them when the files change or the component unmounts. Keyed by file id.
 */
export function useFileBlobUrls(responseId: string, fileIds: string[]): Record<string, BlobUrlState> {
  const [states, setStates] = useState<Record<string, BlobUrlState>>({});
  const key = fileIds.join(',');

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    for (const id of key ? key.split(',') : []) {
      responsesService
        .getFileBlobUrl(responseId, id)
        .then((url) => {
          if (cancelled) return URL.revokeObjectURL(url);
          created.push(url);
          setStates((prev) => ({ ...prev, [id]: { status: 'ready', url } }));
        })
        .catch(() => {
          if (!cancelled) setStates((prev) => ({ ...prev, [id]: { status: 'error' } }));
        });
    }
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
      setStates({});
    };
  }, [responseId, key]);

  return states;
}
