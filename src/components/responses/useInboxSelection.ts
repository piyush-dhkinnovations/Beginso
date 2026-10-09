'use client';

import { useState } from 'react';
import type { BulkTarget } from '@/types/response';

export interface ConfirmDeleteState {
  mode: 'single' | 'bulk';
  target: BulkTarget;
  count: number;
}

/** Row selection + the pending delete-confirmation, shared by the Table and its modal. */
export function useInboxSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectAllMatching(false);
  }

  return { selectedIds, setSelectedIds, selectAllMatching, setSelectAllMatching, confirmDelete, setConfirmDelete, clearSelection };
}
