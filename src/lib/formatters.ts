import type { ResponseAnswers } from '@/types/response';
import type { ApproxLocation } from '@/types/settings';
import type { FormField } from '@/types/form';

// `{}` for an unresolved IP (private/local ranges, lookup failure) is indistinguishable from a
// resolved-but-sparse location without checking every field — join whatever city/region/country
// the backend did resolve, falling back to "Unknown location" only once none of them are present.
export function formatApproxLocation(location: ApproxLocation | null | undefined): string {
  if (!location || typeof location !== 'object') return 'Unknown location';
  const parts = [location.city, location.region, location.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Unknown location';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatResponseDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString(undefined, { month: 'short' });
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} ${month} ${date.getFullYear()}, ${time}`;
}

/** "just now" / "5 minutes ago" / "3 hours ago" / "2 days ago" — for Report Job rows'
 * "Requested {time} ago" timestamp. Falls back to the absolute date once it's been over a week,
 * since "9 days ago" is less useful than the actual date at that point. */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function detectBrowser(ua: string): string | null {
  const match =
    ua.match(/Edg\/(\d+)/) ??
    ua.match(/OPR\/(\d+)/) ??
    (!/Chromium/.test(ua) ? ua.match(/Chrome\/(\d+)/) : null) ??
    ua.match(/Firefox\/(\d+)/) ??
    (/Safari/.test(ua) ? ua.match(/Version\/(\d+)/) : null);
  if (!match) return null;
  const name = ua.includes('Edg/') ? 'Edge' : ua.includes('OPR/') ? 'Opera'
    : ua.includes('Firefox/') ? 'Firefox' : ua.includes('Chrome/') ? 'Chrome' : 'Safari';
  return `${name} ${match[1]}`;
}

function detectOS(ua: string): string | null {
  if (/Windows/.test(ua)) return 'Windows';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Linux/.test(ua)) return 'Linux';
  return null;
}

export function parseUserAgent(ua: string): string {
  const browser = ua ? detectBrowser(ua) : null;
  const os = ua ? detectOS(ua) : null;
  return `${browser ?? 'Unknown browser'} on ${os ?? 'Unknown OS'}`;
}

export function shortId(id: string): string {
  return (id.length <= 6 ? id : id.slice(-6)).toUpperCase();
}

export function buildAnswerPreview(answers: ResponseAnswers, maxLength = 60): string {
  const preview = Object.values(answers)
    .filter((value) => value !== null && value !== undefined && value !== '')
    .slice(0, 2)
    .map((value) => (Array.isArray(value) ? value.join(', ') : String(value)))
    .join(' · ');
  return preview.length > maxLength ? preview.slice(0, maxLength) : preview;
}

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;

export interface RespondentIdentity {
  label?: string;
  email?: string;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const FULL_NAME_RE = /^(your |full |respondent |contact )?name\b/i;

/**
 * Who submitted this response. The name comes ONLY from a name-labelled short-text field ("Full name",
 * "Name", or "First name" + "Last name"); the email from an email field, or any email-shaped answer.
 * An arbitrary answer ("Meeting", "No") is never a person. Without `fields` (still loading, or the
 * lookup failed) no name is guessed; callers render "Anonymous".
 */
export function detectRespondentIdentity(answers: ResponseAnswers, fields?: FormField[]): RespondentIdentity {
  const live = (fields ?? []).filter((f) => !f.deleted);
  const answer = (f?: FormField) => (f ? str(answers[f.fieldId]) : undefined);
  const emailField = live.find((f) => f.type === 'email' && answer(f));
  const email = answer(emailField) ?? Object.values(answers).map(str).find((v) => v && EMAIL_RE.test(v));

  const textFields = live.filter((f) => f.type === 'short_text' && answer(f));
  const full = textFields.find((f) => FULL_NAME_RE.test(f.label.trim()));
  const first = textFields.find((f) => /^first name\b/i.test(f.label.trim()));
  const last = textFields.find((f) => /^(last|family) name\b/i.test(f.label.trim()));
  const label = (answer(full) ?? [answer(first), answer(last)].filter(Boolean).join(' ')) || undefined;

  return { label: label?.slice(0, 60), email: email?.match(EMAIL_RE)?.[0] };
}

/**
 * Up to two initials (first and last word) for an avatar. Works on code points, so an emoji is never split
 * into a broken surrogate; markup and symbols are ignored. Returns '' when there is no letter at all, so the
 * caller can show a neutral icon.
 */
export function initialsOf(name?: string): string {
  const letters = (name ?? '')
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .map((word) => Array.from(word).find((ch) => /\p{L}/u.test(ch)))
    .filter((ch): ch is string => !!ch);
  if (letters.length === 0) return '';
  const pair = letters.length > 1 ? letters[0] + letters[letters.length - 1] : letters[0];
  return pair.toLocaleUpperCase();
}
