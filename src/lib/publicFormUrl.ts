/**
 * The one place that turns a form's public link into a URL. Shared by the publish dialog, Share
 * tab, settings panel, embed codes and QR code.
 *
 * - Slug: the server-assigned `publishedSlug` when present. `slug` alone is only safe for a form
 *   that is currently published - a draft carries a reserved title-derived slug that is NOT live.
 * - Origin: NEXT_PUBLIC_APP_URL, normalised to https and the canonical `www.` host (a bare
 *   `http://beginso.com` redirects twice). localhost / IPs are left untouched for dev.
 */
const APEX_HOSTS = new Set(['beginso.com']);

export function publicOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  try {
    const url = new URL(raw);
    const local = url.hostname === 'localhost' || /^[\d.]+$/.test(url.hostname) || url.hostname.endsWith('.local');
    if (!local) {
      url.protocol = 'https:';
      if (APEX_HOSTS.has(url.hostname)) url.hostname = `www.${url.hostname}`;
    }
    return url.origin;
  } catch {
    return raw.replace(/\/$/, '');
  }
}

export function publicFormSlug(form: { slug?: string | null; publishedSlug?: string | null }): string | undefined {
  return form.publishedSlug || form.slug || undefined;
}

export function buildPublicFormUrl(slug: string | null | undefined): string {
  return slug ? `${publicOrigin()}/f/${slug}` : '';
}
