import type { ReportStatus } from '@/types/report';

/** True iff the job might still change state and is worth polling for — `queued`/`processing`
 * only; `completed`/`failed`/`expired` are all terminal. */
export function shouldPollReportJob(status: ReportStatus): boolean {
  return status === 'queued' || status === 'processing';
}
