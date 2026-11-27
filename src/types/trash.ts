/**
 * GET /api/trash.
 * `daysLeft`, `purgeAt`, `canRestore` and `canPurge` are server-computed; the UI renders them and
 * never re-derives roles or the 30-day clock.
 */
export type TrashItemType = 'form' | 'response';

export interface TrashItem {
  id: string;
  type: TrashItemType;
  name: string;
  formId?: string;
  formTitle?: string;
  responseCount?: number;
  deletedAt: string;
  deletedBy: { id: string; name: string } | null;
  purgeAt: string;
  daysLeft: number;
  canRestore: boolean;
  canPurge: boolean;
}

export interface TrashListResponse {
  items: TrashItem[];
  total: number;
  page: number;
  limit: number;
  storageBytes: number;
}
