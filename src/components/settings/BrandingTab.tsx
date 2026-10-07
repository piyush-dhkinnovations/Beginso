'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import type { FormBranding } from '@/types/form';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { WorkspaceBrandingEditor } from './WorkspaceBrandingEditor';

// Workspace branding DEFAULTS for new forms. Edits are a draft: nothing is saved until "Save changes", and
// "Cancel" returns to what is saved. (The previous version saved on every click, which made a mis-click on the
// colour or a logo permanent.) The save bar stays pinned to the bottom of the viewport while the page scrolls.
const KEYS: (keyof FormBranding)[] = ['primaryColor', 'logoUrl', 'coverImageUrl', 'buttonStyle', 'buttonRadius', 'coverPosition', 'showProgress', 'spacing'];

const same = (a: FormBranding, b: FormBranding) => KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null));

export function BrandingTab({ scope, onDirtyChange }: { scope?: string; onDirtyChange?: (dirty: boolean) => void } = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workspace, isLoading, isError, refetch } = useQuery({
    queryKey: settingsKeys.workspace(scope),
    queryFn: () => settingsService.getWorkspace(scope),
  });

  // `saved` is what the server has; `draft` is what the editor shows. Synced once on first load, and again only
  // after our own save — never on a stray refetch, which could clobber an edit in progress.
  const [saved, setSaved] = useState<FormBranding>({});
  const [draft, setDraft] = useState<FormBranding>({});
  const [hasSynced, setHasSynced] = useState(false);
  if (workspace && !hasSynced) {
    setHasSynced(true);
    setSaved(workspace.branding ?? {});
    setDraft(workspace.branding ?? {});
  }

  const dirty = !same(saved, draft);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const save = useMutation({
    mutationFn: (next: FormBranding) => {
      // null = "clear this back to the default" (the server removes a key sent as null; an omitted key is kept).
      const payload: Record<string, unknown> = {};
      for (const k of KEYS) payload[k] = next[k] ?? null;
      return settingsService.updateWorkspace({ branding: payload as FormBranding }, scope);
    },
    onSuccess: (_r, next) => {
      setSaved(next);
      void queryClient.invalidateQueries({ queryKey: settingsKeys.workspace(scope) });
      toast('Branding defaults saved.', 'success');
    },
    onError: () => toast('Failed to save branding. Please try again.', 'error'),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 animate-pulse" aria-label="Loading branding">
        <div className="h-96 rounded-lg bg-(--border-default)" />
        <div className="h-96 rounded-lg bg-(--border-default)" />
      </div>
    );
  }

  if (isError || !workspace) {
    return (
      <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
        <p className="bg-body-sm text-(--text-primary)">Unable to load branding defaults.</p>
        <Button variant="secondary" size="small" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <WorkspaceBrandingEditor branding={draft} onChange={(updates) => setDraft((d) => ({ ...d, ...updates }))} />

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-(--border-default) bg-(--surface-card) px-4 py-3 shadow-(--shadow-md)">
        <p className="flex items-center gap-2 bg-body-sm text-(--text-muted)">
          <Info size={14} className="shrink-0" aria-hidden="true" />
          These settings apply to new forms only — existing forms keep their own branding.
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="min-h-11" onClick={() => setDraft(saved)} disabled={!dirty || save.isPending}>
            Cancel
          </Button>
          <Button type="button" className="min-h-11" onClick={() => save.mutate(draft)} isLoading={save.isPending} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
