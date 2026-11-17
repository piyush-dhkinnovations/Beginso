import { useEffect, useState } from 'react';
import { GALLERY_STYLES, type GalleryStyle } from '@/lib/formStyles';
import { formLooksService } from '@/services/formLooks';

// The live list is kept for the page's lifetime (the Looks change with a deploy, not while someone is editing), so opening the dialog twice asks once.
// Plain state rather than a query, so any screen can show the Looks without a query provider around it.
let live: readonly GalleryStyle[] | null = null;
let pending: Promise<void> | null = null;

/** Only for tests: forget the list fetched so far. */
export const resetFormLooksCache = () => {
  live = null;
  pending = null;
};

/**
 * The ready-made Looks. They show at once from the copy bundled with the app, and are replaced by the live list (GET /api/form-looks) when it
 * arrives, so a Look added on the server shows up without a new release. If the API cannot be reached the bundled copy stays.
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
