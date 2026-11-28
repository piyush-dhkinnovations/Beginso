// The sidebar's storage bar and the "n of m workspaces" counts come from GET /api/users/me, so they go stale the
// moment anything that changes storage succeeds (delete, empty Trash, create, upload...). Instead of every
// mutation remembering to invalidate that query, the axios layer reports each successful write that can change
// storage, and QueryProvider (which owns the query client) refreshes the profile query, at most once per window.

/** Writes (POST/PUT/PATCH/DELETE) to these areas can change storage or the workspace count. */
const STORAGE_AREAS = /\/api\/(forms|responses|trash|upload|workspaces|templates)(\/|\?|$)/;
const WRITES = new Set(['post', 'put', 'patch', 'delete']);

// Saving a form's content (the builder's Save and auto save) does not move the numbers in any way a person would see,
// so it does not cost an extra request each time. Uploads, deletes and everything else above still refresh at once.
const FORM_CONTENT_SAVE = /\/api\/forms\/[^/?]+(\?|$)/;

export function affectsStorage(method: string | undefined, url: string | undefined): boolean {
  if (!method || !url) return false;
  const m = method.toLowerCase();
  if ((m === 'patch' || m === 'put') && FORM_CONTENT_SAVE.test(url)) return false;
  return WRITES.has(m) && STORAGE_AREAS.test(url);
}

type Listener = () => void;
let listener: Listener | null = null;

/** QueryProvider registers the function that refreshes the allowance. Returns an unsubscribe. */
export function onStorageMayHaveChanged(fn: Listener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

export function notifyStorageMayHaveChanged(): void {
  listener?.();
}

/** Trailing throttle: many writes in a burst (autosave, bulk actions) cost one refresh. */
export function throttleTrailing(fn: () => void, windowMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      fn();
    }, windowMs);
  };
}
