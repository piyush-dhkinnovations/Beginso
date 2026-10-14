const MB = 1024 * 1024;

export function formatStorage(bytes: number): string {
  if (bytes >= 1024 * MB) return `${(bytes / (1024 * MB)).toFixed(1)} GB`;
  return `${Math.round(bytes / MB)} MB`;
}

export type StorageLevel = 'ok' | 'warning' | 'full';

/** 80% shows a warning colour, 100% reads as full. */
export function storageLevel(used: number, quota: number): StorageLevel {
  if (quota <= 0) return 'ok';
  const ratio = used / quota;
  return ratio >= 1 ? 'full' : ratio >= 0.8 ? 'warning' : 'ok';
}
