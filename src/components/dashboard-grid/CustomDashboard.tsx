'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { dashboardKeys } from '@/lib/queryKeys';
import { dashboardLayoutService } from '@/services/dashboardLayout';
import { AddWidgetDrawer } from './AddWidgetDrawer';
import { DashboardGrid } from './DashboardGrid';
import type { MetricMap, Widget } from './types';

let seq = 0;
const uid = () => `w${Date.now().toString(36)}${seq++}`;

export interface CustomDashboardProps {
  /** 'personal' or a workspace slug — the scope the layout is stored under. */
  scope: string;
  /** What a user who never customised sees. Lives in code, never in the database. */
  defaults: Widget[];
  metrics: MetricMap;
  /** Server enforces this too; here it only decides whether to show Customize. */
  canEdit?: boolean;
  enabled?: boolean;
  /** Heading shown on the left of the toolbar row, so the buttons sit on a labelled row, not alone. */
  title?: string;
}

// Saved layout (or the defaults) rendered on the grid, with Customize -> drag / resize / remove / add -> Save.
// Draft lives here until Save; Cancel throws it away. A stale save (409) reloads the server copy.
export function CustomDashboard({ scope, defaults, metrics, canEdit = true, enabled = true, title }: CustomDashboardProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const key = dashboardKeys.layout(scope);
  const [draft, setDraft] = useState<Widget[] | null>(null);
  const [adding, setAdding] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => dashboardLayoutService.get(scope), enabled, retry: false });
  const saved = data?.widgets ?? defaults;
  const editing = draft !== null;

  const save = useMutation({
    mutationFn: (widgets: Widget[]) => dashboardLayoutService.save(scope, widgets, data?.version),
    onSuccess: (layout) => {
      qc.setQueryData(key, layout);
      setDraft(null);
      toast('Dashboard saved.', 'success');
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast('Someone else changed this dashboard. Showing the latest version.', 'error');
        setDraft(null);
        void qc.invalidateQueries({ queryKey: key });
      } else if (isAxiosError(error) && error.response?.status === 403) {
        toast("You don't have permission to change this dashboard.", 'error');
      } else toast("Couldn't save the dashboard. Try again.", 'error');
    },
  });

  const reset = useMutation({
    mutationFn: () => dashboardLayoutService.reset(scope),
    onSuccess: () => {
      qc.setQueryData(key, null);
      setDraft(null);
      toast('Dashboard reset to the default layout.', 'success');
    },
    onError: () => toast("Couldn't reset the dashboard. Try again.", 'error'),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="block" width="100%" height={160} />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {(canEdit || title) && (
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
          {title ? <h2 className="bg-h5 font-bold text-(--text-primary)">{title}</h2> : <span />}
          {canEdit && <div className="flex flex-wrap justify-end gap-2">
          {editing ? (
            <>
              <Button variant="secondary" size="small" onClick={() => setAdding(true)}><Plus size={16} className="mr-1" />Add widget</Button>
              <Button variant="secondary" size="small" onClick={() => reset.mutate()} disabled={reset.isPending || !data}>Reset to default</Button>
              <Button variant="secondary" size="small" onClick={() => setDraft(null)}>Cancel</Button>
              <Button size="small" onClick={() => save.mutate(draft)} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
            </>
          ) : (
            <Button variant="secondary" size="small" onClick={() => setDraft(saved)}><SlidersHorizontal size={16} className="mr-1" />Customize</Button>
          )}
          </div>}
        </div>
      )}

      <DashboardGrid
        widgets={draft ?? saved}
        metrics={metrics}
        onChange={editing ? setDraft : undefined}
        empty={<p className="bg-body text-(--text-muted)">No widgets yet. {canEdit ? 'Click Customize, then Add widget.' : ''}</p>}
      />

      <AddWidgetDrawer isOpen={adding} onClose={() => setAdding(false)} metrics={metrics} onAdd={(w) => setDraft((d) => [...(d ?? saved), { ...w, id: uid() }])} />
    </div>
  );
}
