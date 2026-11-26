/**
 * The Beginso mark. Raise the number whenever public/favicon.svg changes: browsers keep that file for a day (and may serve the
 * old copy for a week), and a new address is fetched at once.
 */
export const BRAND_MARK = '/favicon.svg?v=2';

/** The logo with the name, for light and for dark surfaces. The same rule: raise the number when a file changes. */
export const WORDMARK_LIGHT = '/logo-full-light.svg?v=1';
export const WORDMARK_DARK = '/logo-full-dark.svg?v=1';
