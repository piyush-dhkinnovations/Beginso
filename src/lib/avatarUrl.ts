// Avatars picked during onboarding used to be saved as an absolute URL on whatever origin the person was on, so accounts created while
// developing hold http://localhost:3000/avatars/01.svg. Browsers block that on the live site (mixed content and CSP). The picture is
// one of this app's own files, so its path alone is the right address.
export function localAvatarSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if ((u.hostname === 'localhost' || u.hostname === '127.0.0.1') && u.pathname.startsWith('/avatars/')) return u.pathname;
  } catch {
    /* a relative path or something odd: leave it alone */
  }
  return url;
}
