import type { ResponseStatus } from '@/types/response';

const RESPONSE_STATUSES = new Set<ResponseStatus>(['new', 'in_progress', 'completed']);

export function normalizeResponseStatus(rawStatus: string | null): ResponseStatus | undefined {
  return rawStatus && RESPONSE_STATUSES.has(rawStatus as ResponseStatus)
    ? (rawStatus as ResponseStatus)
    : undefined;
}

export function normalizeResponsePage(rawPage: string | null): number {
  if (rawPage === null) return 1;
  const page = Number(rawPage);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function clampResponsePage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

export async function runSequentially<T>(items: readonly T[], operation: (item: T) => Promise<unknown>): Promise<void> {
  for (const item of items) {
    await operation(item);
  }
}
