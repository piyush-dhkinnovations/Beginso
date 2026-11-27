import type { ResponseFilters } from './response';
import type { InboxViewMode } from '@/lib/inboxFilters';

export type SavedViewVisibility = 'personal' | 'team';

export interface SavedView {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  visibility: SavedViewVisibility;
  /** null = workspace-wide ("All Responses"); set = scoped to one form. */
  formId: string | null;
  filters: ResponseFilters;
  viewMode: InboxViewMode;
  createdAt: string;
}

/** POST/PATCH /api/views body. */
export interface SavedViewPayload {
  name: string;
  visibility: SavedViewVisibility;
  formId?: string | null;
  filters: ResponseFilters;
  viewMode: InboxViewMode;
}
