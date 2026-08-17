'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormBranding } from '@/types/form';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/common/Toast';
import { Button } from '@/components/ui/Button';
import { BrandingPanel } from '@/components/form-builder/BrandingPanel';

// Reuses the Builder's BrandingPanel wholesale (color picker + logo/cover upload zones with their
// own "Remove" actions + BrandingLivePreview) rather than a second implementation — it's already
// a fully generic controlled component ({ branding, formTitle, onUpdate }), no Builder-specific
// coupling. "New Form" as the preview's formTitle matches Requirement 6.2's wording exactly
// ("how a new form's header would look").
export function BrandingTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Shares the same query WorkspaceTab reads — one cache entry, so a name change on that tab and
  // a branding change here never race each other's cached copy (design.md §8).
  const { data: workspace, isLoading, isError, refetch } = useQuery({
    queryKey: settingsKeys.workspace(),
    queryFn: settingsService.getWorkspace,
  });

  // Adjusts local state during render when the query first resolves, rather than in a
  // useEffect — same "re-sync when the source changes externally" pattern BrandingPanel.tsx
  // itself already uses for its own local hex-input state (see its `prevColor` comment).
  // Only syncs once (on first load), not on every later `workspace` reference change — a
  // mutation's own `invalidateQueries` triggers exactly that kind of change right after a
  // save, and re-syncing then could clobber the just-uploaded optimistic state with a
  // response that hasn't caught up yet (real bug: logo/cover upload disappearing until a
  // hard reload). The optimistic `setBranding(next)` in `handleUpdate` is the source of
  // truth for anything the user just changed in this session.
  const [branding, setBranding] = useState<FormBranding>({});
  const [hasSynced, setHasSynced] = useState(false);
  if (workspace && !hasSynced) {
    setHasSynced(true);
    setBranding(workspace.branding ?? {});
  }

  const updateBrandingMutation = useMutation({
    mutationFn: (next: FormBranding) => settingsService.updateWorkspace({ branding: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.workspace() });
      toast('Branding defaults updated.', 'success');
    },
    onError: () => toast('Failed to update branding. Please try again.', 'error'),
  });

  // BrandingPanel's onUpdate fires per-interaction (color pick, hex commit, image upload/remove)
  // rather than a single form submit — each one is treated as its own save, matching how the
  // Builder's own autosave already treats this same component's updates.
  function handleUpdate(updates: Partial<FormBranding>) {
    const next = { ...branding, ...updates };
    setBranding(next);
    updateBrandingMutation.mutate(next);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-24 w-24 rounded-lg bg-neutral-200" />
        <div className="h-10 bg-neutral-200 rounded w-full" />
      </div>
    );
  }

  if (isError || !workspace) {
    return (
      <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <p className="text-body-sm text-neutral-700">Unable to load branding defaults.</p>
        <Button variant="secondary" size="small" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BrandingPanel branding={branding} formTitle="New Form" onUpdate={handleUpdate} />
      <p className="text-caption text-neutral-500">
        These defaults apply to new forms only — existing forms keep their own branding.
      </p>
    </div>
  );
}
