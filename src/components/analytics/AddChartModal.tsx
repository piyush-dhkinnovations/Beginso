'use client';

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Radio } from '@/components/ui/Radio';
import { Stepper } from '@/components/ui/Stepper';
import { useToast } from '@/components/ui/Toast';
import { ChartSeriesView } from './CustomChartCard';
import { chartsService } from '@/services/charts';
import { analyticsKeys, type AnalyticsRangeParams } from '@/lib/queryKeys';
import { allowedChartTypes, allowedGroupings, CHART_GROUP_LABEL, CHART_TYPE_LABEL, isSummarisableField } from '@/lib/chartOptions';
import type { FormField } from '@/types/form';

const CHART_TYPES = ['bar', 'donut', 'line'] as const;
const GROUPINGS = ['value', 'day', 'week'] as const;

// design.md §14: an invalid combination is not selectable - the schema is the second line of defence.
function buildSchema(fields: FormField[]) {
  return z
    .object({
      fieldId: z.string().min(1, 'Pick a field to chart.'),
      chartType: z.enum(CHART_TYPES, { message: 'Pick a chart type.' }),
      groupBy: z.enum(GROUPINGS, { message: 'Pick how to group.' }),
    })
    .superRefine((v, ctx) => {
      const field = fields.find((f) => f.fieldId === v.fieldId);
      if (!field) return;
      if (!allowedChartTypes(field.type).includes(v.chartType)) ctx.addIssue({ code: 'custom', path: ['chartType'], message: 'That chart type does not suit this field.' });
      if (!allowedGroupings(field.type).includes(v.groupBy)) ctx.addIssue({ code: 'custom', path: ['groupBy'], message: 'That grouping does not suit this field.' });
    });
}
type Values = z.infer<ReturnType<typeof buildSchema>>;

const STEPS = [{ label: 'Field' }, { label: 'Chart type' }, { label: 'Group by' }];

interface AddChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  scope: string;
  fields: FormField[];
  range: AnalyticsRangeParams;
}

// Sprint 14 (OQ-1 decided, task 3.5): field -> type -> group, with a live preview. No wireframe -
// derived from the Modal + Stepper pattern (design.md §15). The bottom-sheet-on-mobile behaviour is
// the design system's own `.bg-modal` rule below 640px. `Modal` mounts its children only while open,
// so the form below starts fresh (step 0, empty draft) every time without a reset effect.
export function AddChartModal({ isOpen, onClose, formId, scope, fields, range }: AddChartModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add a chart" description="Summarise one field of this form." size="lg">
      <AddChartForm onClose={onClose} formId={formId} scope={scope} fields={fields} range={range} />
    </Modal>
  );
}

function AddChartForm({ onClose, formId, scope, fields, range }: Omit<AddChartModalProps, 'isOpen'>) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const summarisable = useMemo(() => fields.filter(isSummarisableField), [fields]);
  const schema = useMemo(() => buildSchema(fields), [fields]);

  const { register, handleSubmit, control, setValue, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { fieldId: '' },
  });

  const fieldId = useWatch({ control, name: 'fieldId' });
  const chartType = useWatch({ control, name: 'chartType' });
  const groupBy = useWatch({ control, name: 'groupBy' });
  const field = summarisable.find((f) => f.fieldId === fieldId);
  const types = field ? allowedChartTypes(field.type) : [];
  const groupings = field ? allowedGroupings(field.type) : [];

  function pickField(id: string) {
    const next = summarisable.find((f) => f.fieldId === id);
    setValue('fieldId', id, { shouldValidate: true });
    // A different field may not support the previous choices - reset to its first valid option.
    const nextTypes = next ? allowedChartTypes(next.type) : [];
    const nextGroups = next ? allowedGroupings(next.type) : [];
    setValue('chartType', (nextTypes.includes(chartType) ? chartType : nextTypes[0]) as Values['chartType'], { shouldValidate: true });
    setValue('groupBy', (nextGroups.includes(groupBy) ? groupBy : nextGroups[0]) as Values['groupBy'], { shouldValidate: true });
  }

  const previewReady = step === 2 && !!field && !!chartType && !!groupBy && formState.isValid;
  const previewQuery = useQuery({
    queryKey: analyticsKeys.chartPreview(formId, { fieldId, chartType, groupBy }, range),
    queryFn: () => chartsService.preview(formId, { fieldId, chartType, groupBy }, range, scope),
    enabled: previewReady,
  });

  const createMutation = useMutation({
    mutationFn: (v: Values) => chartsService.create(formId, v, scope),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.charts(formId) });
      toast('Chart added.', 'success');
      onClose();
    },
    onError: (error) => {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      toast(status === 403 ? "You don't have permission to add charts to this form." : 'Could not add the chart. Please try again.', 'error');
    },
  });

  const stepValid = step === 0 ? !!field : step === 1 ? !!chartType && types.includes(chartType) : formState.isValid;
  const title = field ? `${field.label} · ${chartType ? CHART_TYPE_LABEL[chartType] : ''}` : 'Preview';

  return (
      <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="flex flex-col gap-4" noValidate>
        <Stepper steps={STEPS} currentStep={step} aria-label="Add a chart steps" />

        {step === 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="bg-label mb-2">Which field?</legend>
            {summarisable.length === 0 ? (
              <p className="bg-body-sm text-(--text-muted)">No fields to chart. Add a choice or date field to this form first.</p>
            ) : (
              summarisable.map((f) => (
                <Radio
                  key={f.fieldId}
                  id={`chart-field-${f.fieldId}`}
                  name="chart-field"
                  label={f.label}
                  description={f.type === 'date' ? 'Date' : 'Choice'}
                  checked={fieldId === f.fieldId}
                  onChange={() => pickField(f.fieldId)}
                />
              ))
            )}
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="bg-label mb-2">Which chart?</legend>
            {types.map((t) => (
              <Radio key={t} id={`chart-type-${t}`} label={CHART_TYPE_LABEL[t]} value={t} {...register('chartType')} />
            ))}
          </fieldset>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="bg-label mb-2">How should answers be grouped?</legend>
              {groupings.map((g) => (
                <Radio key={g} id={`chart-group-${g}`} label={CHART_GROUP_LABEL[g]} value={g} {...register('groupBy')} />
              ))}
            </fieldset>
            <div aria-live="polite" className="rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
              {previewQuery.isLoading ? (
                <div className="h-40 animate-pulse rounded-lg bg-(--bg-sunken)" aria-busy="true" aria-label="Loading preview" />
              ) : previewQuery.isError ? (
                <div className="flex items-center justify-between gap-3">
                  <p role="alert" className="bg-body-sm text-(--text-muted)">The preview could not be loaded.</p>
                  <Button variant="secondary" size="small" onClick={() => void previewQuery.refetch()}>Try again</Button>
                </div>
              ) : previewQuery.data && previewQuery.data.total > 0 ? (
                <ChartSeriesView chartType={chartType} data={previewQuery.data} title={title} />
              ) : (
                <p className="bg-body-sm text-(--text-muted)">No answers yet in this range, so there is nothing to preview. You can still add the chart.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={step === 0 ? onClose : () => setStep(step - 1)}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!stepValid}>Next</Button>
          ) : (
            <Button type="submit" disabled={!stepValid} isLoading={createMutation.isPending}>Add chart</Button>
          )}
        </div>
      </form>
  );
}
