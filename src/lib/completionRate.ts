/**
 * Why a completion rate is shown as "—". The API returns null when there are no counted views, or when there are MORE
 * responses than views (view counting is incomplete: older responses predate it, and visitors behind one network
 * address count once an hour), because a rate over those numbers would be made up. Say which, instead of always
 * claiming "not enough views".
 */
export function completionRateUnavailableReason(responses: number | undefined, views: number | null | undefined): string {
  const answered = responses ?? 0;
  const seen = views ?? 0;
  if (answered > 0 && seen > 0 && answered > seen) {
    return 'More responses than recorded views, so a rate would be misleading. Views are counted once per network address per hour.';
  }
  if (answered > 0 && seen === 0) {
    return 'No views were recorded for this form. Its responses may predate view counting.';
  }
  return 'Not enough views yet';
}
