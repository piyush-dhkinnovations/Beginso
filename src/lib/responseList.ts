export function normalizeResponsePage(rawPage: string | null): number {
  if (rawPage === null) return 1;
  const page = Number(rawPage);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function clampResponsePage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

