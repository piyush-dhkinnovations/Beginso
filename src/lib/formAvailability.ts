/**
 * Client-side courtesy check: is this form's closeDate already in the past?
 * This is a UX nicety only — it can be bypassed by anyone hitting the backend
 * directly, so the backend must independently enforce closeDate at submit time
 * (and ideally on GET /api/public/:slug too). See markdown/backend_bugs_public_form_submit.md.
 */
export function isPastCloseDate(closeDate: string | undefined, now: Date = new Date()): boolean {
  if (!closeDate) return false;
  const parsed = new Date(closeDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < now.getTime();
}
