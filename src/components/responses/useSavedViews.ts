'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { viewsService } from '@/services/views';
import { viewKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import type { SavedView } from '@/types/savedView';
import type { useInboxFilters } from '@/hooks/useInboxFilters';
import type { useWorkspaceRole } from '@/hooks/useWorkspaceRole';

type InboxFilters = ReturnType<typeof useInboxFilters>;

interface Options {
  scope: string;
  formId?: string;
  filters: InboxFilters['filters'];
  view: InboxFilters['view'];
  setFilters: InboxFilters['setFilters'];
  role: ReturnType<typeof useWorkspaceRole>;
  clearSelection: () => void;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.6 (task 2.6). Views are a workspace
 * concept (OQ-9) — not fetched for the personal shell, same gate `useTags`/`useMembers` apply.
 */
export function useSavedViews({ scope, formId, filters, view, setFilters, role, clearSelection }: Options) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: views } = useQuery({
    queryKey: viewKeys.list(scope, formId),
    queryFn: () => viewsService.list(scope, formId),
    enabled: scope !== 'personal',
  });
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | undefined>();
  const canCreateTeamView = role === 'owner' || role === 'admin' || role === 'editor' || role === 'member';

  function invalidateViews() {
    queryClient.invalidateQueries({ queryKey: viewKeys.list(scope, formId) });
  }

  function applyView(savedView: SavedView) {
    setActiveViewId(savedView.id);
    clearSelection();
    setFilters({ ...savedView.filters, view: savedView.viewMode }, { resetPage: true });
  }

  function clearAppliedView() {
    setActiveViewId(undefined);
  }

  function saveView(values: { name: string; visibility: 'personal' | 'team' }) {
    // Sprint 12 (inbox-collaboration), task 3.1: was hardcoded to 'table' (yesterday's report) —
    // Save view now captures whichever view is actually active.
    viewsService
      .create(scope, { name: values.name, visibility: values.visibility, formId: formId ?? null, filters, viewMode: view })
      .then((savedView) => {
        invalidateViews();
        setActiveViewId(savedView.id);
        setSaveViewOpen(false);
        toast('View saved.', 'success');
      })
      .catch(() => toast('Failed to save the view. Please try again.', 'error'));
  }

  function renameView(target: SavedView, name: string) {
    viewsService
      .update(scope, target.id, { name })
      .then(() => {
        invalidateViews();
        toast('View renamed.', 'success');
      })
      .catch(() => toast('Failed to rename the view. Please try again.', 'error'));
  }

  function deleteView(target: SavedView) {
    viewsService
      .remove(scope, target.id)
      .then(() => {
        invalidateViews();
        if (activeViewId === target.id) clearAppliedView();
        toast('View deleted.', 'success', undefined, {
          label: 'Undo',
          onClick: () =>
            viewsService
              .create(scope, { name: target.name, visibility: target.visibility, formId: target.formId, filters: target.filters, viewMode: target.viewMode })
              .then(() => {
                invalidateViews();
                toast('View restored.', 'success');
              })
              .catch(() => toast('Failed to restore the view.', 'error')),
        });
      })
      .catch(() => toast('Failed to delete the view. Please try again.', 'error'));
  }

  return { views, saveViewOpen, setSaveViewOpen, activeViewId, canCreateTeamView, applyView, clearAppliedView, saveView, renameView, deleteView };
}
