import { useEffect, useState } from 'react';
import { BUNDLED_LOOKS_VERSION, GALLERY_STYLES, type GalleryStyle } from '@/lib/formStyles';
import { formLooksService } from '@/services/formLooks';

// The live list is kept for the page's lifetime (the Looks change with a deploy, not while someone is editing), so opening the dialog twice asks once.
// Plain state rather than a query, so any screen can show the Looks without a query provider around it.
let live: readonly GalleryStyle[] | null = null;
let pending: Promise<void> | null = null;
let warned = false;

/** Only for tests: forget the list fetched so far. */
export const resetFormLooksCache = () => {
  live = null;
  pending = null;
  warned = false;
};

/** Development only: the live Looks are a different version from the copy bundled with the app, so `npm run sync:looks` is due. Said once. */
export function warnIfLooksBehind(liveVersion: number | null): void {
  if (process.env.NODE_ENV === 'production' || warned || liveVersion === null || liveVersion === BUNDLED_LOOKS_VERSION) return;
  warned = true;
  console.warn(`The Looks on the server are version ${liveVersion}, the copy in this app is version ${BUNDLED_LOOKS_VERSION}. Run: npm run sync:looks`);
}

/**
 * The ready-made Looks (retired ones included: use visibleLooks for the gallery). They show at once from the copy bundled with the app, and are
 * replaced by the live list (GET /api/form-looks) when it arrives, so a Look added on the server shows up without a new release. If the API
 * cannot be reached the bundled copy stays.
 */
export function useFormLooks(): readonly GalleryStyle[] {
  const [looks, setLooks] = useState<readonly GalleryStyle[]>(live ?? GALLERY_STYLES);
  useEffect(() => {
    if (live) return;
    let alive = true;
    pending ??= formLooksService
      .list()
      .then((r) => {
        live = r.looks;
        warnIfLooksBehind(r.version);
      })
      .catch(() => {
        // keep the bundled copy; try again the next time a screen asks
        pending = null;
      });
    void pending.then(() => {
      if (alive && live) setLooks(live);
    });
    return () => {
      alive = false;
    };
  }, []);
  return looks;
}
