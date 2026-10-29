const FILE_PATH = '/api/upload/file/';

/**
 * The address to put in an <img> (or a CSS url()) for a picture the backend stores: a logo, a cover, a page background.
 *
 * The backend answers an upload with its OWN address, built from the request it received: http://192.168.33.47:5000/api/upload/file/...
 * in development, an old domain after the backend moved, http:// behind a proxy that did not say it is https. The page's security policy
 * lets images in only from this site or from https, so such a picture was blocked and showed as a broken image (a cover that was uploaded
 * and never appeared). The file is public, and the app already reaches the backend through its own address (/api/backend), so an uploaded
 * file is always asked for there: the same site, the same protocol, whatever host it was stored with. Any other address (a picture from
 * the web, a blob or data URL from the guest builder) is left alone.
 */
export function uploadSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  let location: URL;
  try {
    location = new URL(url, 'http://app.invalid');
  } catch {
    return url;
  }
  return location.pathname.startsWith(FILE_PATH) ? `/api/backend${location.pathname}${location.search}` : url;
}
