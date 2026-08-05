import type { ResponseAnswers } from '@/types/response';

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
