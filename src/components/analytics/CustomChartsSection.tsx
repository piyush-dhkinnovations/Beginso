'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, LockKeyhole, Plus } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { AddChartModal } from './AddChartModal';
import { CustomChartCard } from './CustomChartCard';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { chartsService } from '@/services/charts';
import { analyticsKeys, type AnalyticsRangeParams } from '@/lib/queryKeys';
import { canEditCharts } from '@/lib/roles';
import type { SavedChart } from '@/types/charts';
import type { Form } from '@/types/form';

interface CustomChartsSectionProps {
  form?: Form;
  formId: string;
  scope: string;
  range: AnalyticsRangeParams;
}

// Sprint 14 (requirements 1.5, tasks 3.4-3.6; cut line #1). Sits below the built-in cards, with the
// "Add a chart" button in the section heading (OQ-1). The button is hidden for roles without edit
// rights as a convenience - BE 0.3 is the real check, and a 403 shows the lock state with no Retry.
export function CustomChartsSection({ form, formId, scope, range }: CustomChartsSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isModalOpen, setModalOpen] = useState(false);
  const canEdit = canEditCharts(useWorkspaceRole(scope));

  const chartsQuery = useQuery({
    queryKey: analyticsKeys.charts(formId),
    queryFn: () => chartsService.list(formId, scope),
  });

  const fieldLabelById = useMemo(() => new Map((form?.fields ?? []).map((f) => [f.fieldId, f.label])), [form]);

  // Optimistic remove with rollback and a toast (design.md §10).
  const removeMutation = useMutation({
    mutationFn: (chart: SavedChart) => chartsService.remove(formId, chart._id, scope),
    onMutate: async (chart) => {
      await queryClient.cancelQueries({ queryKey: analyticsKeys.charts(formId) });
      const previous = queryClient.getQueryData<SavedChart[]>(analyticsKeys.charts(formId));
      queryClient.setQueryData<SavedChart[]>(analyticsKeys.charts(formId), (old) => old?.filter((c) => c._id !== chart._id));
      return { previous };
    },
    onError: (_error, _chart, context) => {
      queryClient.setQueryData(analyticsKeys.charts(formId), context?.previous);
      toast('Could not remove the chart. Please try again.', 'error');
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: analyticsKeys.charts(formId) }),
  });

  const status = isAxiosError(chartsQuery.error) ? chartsQuery.error.response?.status : undefined;
  const charts = chartsQuery.data ?? [];

  return (
    <section aria-labelledby="custom-charts-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="custom-charts-heading" className="bg-h5 text-(--text-primary) font-bold">Your charts</h3>
        {canEdit && status !== 403 && (
          <Button variant="secondary" size="small" onClick={() => setModalOpen(true)}>
            <Plus size={14} className="mr-1.5" aria-hidden="true" />
            Add a chart
          </Button>
        )}
      </div>

      {chartsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-busy="true" aria-label="Loading your charts">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <div className="h-48 animate-pulse rounded-lg bg-(--bg-sunken)" />
            </Card>
          ))}
        </div>
      ) : chartsQuery.isError ? (
        status === 403 ? (
          <EmptyState icon={<LockKeyhole />} title="No access" description="You don't have permission to view charts on this form." />
        ) : (
          <EmptyState
            icon={<AlertCircle />}
            title="Unable to load your charts"
            description="The rest of the dashboard is still available."
            actions={<Button variant="secondary" size="small" onClick={() => void chartsQuery.refetch()}>Try again</Button>}
          />
        )
      ) : charts.length === 0 ? (
        <p className="bg-body-sm text-(--text-muted)">
          {canEdit ? 'No custom charts yet. Add one to summarise a field of this form.' : 'No custom charts on this form yet.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {charts.map((chart) => (
            <CustomChartCard
              key={chart._id}
              formId={formId}
              scope={scope}
              chart={chart}
              fieldLabel={fieldLabelById.get(chart.fieldId)}
              range={range}
              canEdit={canEdit}
              onRemove={(c) => removeMutation.mutate(c)}
              isRemoving={removeMutation.isPending && removeMutation.variables?._id === chart._id}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <AddChartModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} formId={formId} scope={scope} fields={form?.fields ?? []} range={range} />
      )}
    </section>
  );
}
