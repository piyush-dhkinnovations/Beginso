'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
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
}

// Saved layout (or the defaults) rendered on the grid, with Customize -> drag / resize / remove / add -> Save.
// Draft lives here until Save; Cancel throws it away. A stale save (409) reloads the server copy.
/** Hook form: `toolbar` (Customize / Save / ...) can sit anywhere, e.g. in a PageHeader; `body` is the grid. */
export function useCustomDashboard({ scope, defaults, metrics, canEdit = true, enabled = true }: CustomDashboardProps) {
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

  const toolbar = canEdit ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {editing ? (
        <>
          <Menu
            trigger={<MoreHorizontal className="bg-icon" />}
            triggerLabel="More dashboard options"
            align="end"
            items={[{ id: 'reset', label: 'Reset to default', icon: <RotateCcw size={16} />, disabled: reset.isPending || !data, onSelect: () => reset.mutate() }]}
          />
          <Button variant="secondary" size="small" onClick={() => setAdding(true)}><Plus size={16} className="sm:mr-1" /><span className="hidden sm:inline">Add widget</span><span className="sr-only sm:hidden">Add widget</span></Button>
          <Button variant="secondary" size="small" onClick={() => setDraft(null)}>Cancel</Button>
          <Button size="small" onClick={() => save.mutate(draft)} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
        </>
      ) : (
        <Button variant="secondary" size="small" onClick={() => setDraft(saved)} disabled={isLoading} aria-label="Customize dashboard">
          <SlidersHorizontal size={16} className="sm:mr-1" /><span className="hidden sm:inline">Customize</span>
        </Button>
      )}
    </div>
  ) : null;

  const body = isLoading ? (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="block" width="100%" height={144} />)}
    </div>
  ) : (
    <>
      <DashboardGrid
        widgets={draft ?? saved}
        metrics={metrics}
        onChange={editing ? setDraft : undefined}
        empty={<p className="bg-body text-(--text-muted)">No widgets yet. {canEdit ? 'Click Customize, then Add widget.' : ''}</p>}
      />
      <AddWidgetDrawer isOpen={adding} onClose={() => setAdding(false)} metrics={metrics} onAdd={(w) => setDraft((d) => [...(d ?? saved), { ...w, id: uid() }])} />
    </>
  );

  return { toolbar, body, editing };
}

/** Self-contained form: toolbar row above the grid. */
export function CustomDashboard(props: CustomDashboardProps) {
  const { toolbar, body } = useCustomDashboard(props);
  return (
    <div className="flex flex-col gap-3">
      {toolbar}
      {body}
    </div>
  );
}
