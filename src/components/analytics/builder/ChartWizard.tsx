'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useFormScope } from '@/hooks/useFormScope';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { formsService } from '@/services/forms';
import { chartBuilderService } from '@/services/chartBuilder';
import { chartsService } from '@/services/charts';
import { chartKeys } from '@/lib/queryKeys';
import { hasCapability } from '@/lib/roles';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { DEFAULT_DISPLAY } from '@/lib/chartBuilder';
import { WizardSteps } from './WizardSteps';
import { StepKind } from './StepKind';
import { StepBasics } from './StepBasics';
import { StepConfigure } from './StepConfigure';
import { StepSave } from './StepSave';
import { ChartPreviewCard } from './ChartPreviewCard';
import { DrillPlaceholder, DrillPreviewCard } from './DrillPreviewCard';
import { STEP_IDS, blockingMessage, definitionOf, effectiveTitle, initialState, isDirty, stateFromChart, stepHint, stepLabel, type WizardState } from './wizardState';

const HEADINGS = {
  kind: { title: 'Create chart', description: 'Choose what kind of chart you want to build.', step: 'What kind of chart?', intro: '' },
  basics: { title: 'Create simple chart', description: 'Give the chart a name and choose what to group the responses by.', step: 'Basic information', intro: 'These two things decide what the chart is about: its name, and the question whose answers become the bars.' },
  configure: { title: 'Create simple chart', description: 'Choose how each group is measured and which responses count.', step: 'Configure chart', intro: 'Choose how each group is measured, how the chart is drawn and sorted, and which responses are counted at all.' },
  save: { title: 'Create simple chart', description: 'Check how it looks, then save it to the dashboard.', step: 'Preview & save', intro: 'Make it look right, choose how big it is on the dashboard, and who can see it.' },
} as const;

/** The same, for a drill-down: it names the chart and sets what is counted first, then adds its levels. */
const DRILL_HEADINGS = {
  ...HEADINGS,
  basics: { title: 'Create drill-down chart', description: 'Name the chart, choose how it is measured and which responses count.', step: 'Basic information', intro: 'What the chart is called, what each bar shows, and which responses are counted. The levels come next.' },
  configure: { title: 'Create drill-down chart', description: 'Add the levels: each click on a bar opens the next one.', step: 'Drill-down levels', intro: 'Level 1 is the chart people see first. Clicking a bar shows that bar’s responses grouped by level 2, and so on.' },
  save: { title: 'Create drill-down chart', description: 'Try it out, then save it to the dashboard.', step: 'Preview & save', intro: 'Make it look right, choose how big it is on the dashboard, and who can see it.' },
} as const;

/**
 * The full-page "Create chart": the choice of kind on its own, then the steps in one row on top, the form under them and the live chart beside it
 * (kept in view while the form scrolls). Everything has a default, so Next, Next, Save gives a good chart. Nothing is disabled without saying
 * why: a step that cannot be left shows its reason in the bar that stays at the bottom of the screen.
 */
export function ChartWizard({ formId, chartId }: { formId: string; chartId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const scope = useFormScope(formId);
  const role = useWorkspaceRole(scope ?? 'personal');
  const { data: form } = useQuery({ queryKey: ['form', formId], queryFn: () => formsService.getFormById(formId), staleTime: 5 * 60_000 });
  const fields = form?.fields;

  // Editing a chart starts on step 2: the kind of chart is already decided.
  const [step, setStep] = useState(chartId ? 1 : 0);
  // Nothing is stored until the person changes something: until then the state is the defaults for this form's questions.
  const [edited, setEdited] = useState<WizardState | null>(null);
  const charts = useQuery({ queryKey: chartKeys.list(scope ?? 'pending', formId), queryFn: () => chartsService.list(formId, scope), enabled: !!chartId && !!scope });
  const existing = chartId ? charts.data?.find((c) => c._id === chartId && (c.kind === 'simple' || c.kind === 'drilldown')) : undefined;
  const baseline = existing ? stateFromChart(existing, fields) : fields ? initialState(fields) : null;
  const state = edited ?? baseline;
  const [notice, setNotice] = useState<string | null>(null);
  // The level being edited on the levels step: the preview shows it. Kept with its step, so coming back to the step starts on level 1 again.
  const [focus, setFocus] = useState({ step: 0, level: 0 });
  const [confirmLeave, setConfirmLeave] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // Focus moves to the step's heading on every change of step (not on the first paint).
  useEffect(() => {
    if (mounted.current) heading.current?.focus();
    mounted.current = true;
  }, [step]);

  const back = `/forms/${formId}/insights${scope && scope !== 'personal' ? `?ws=${encodeURIComponent(scope)}` : ''}`;
  const patch = (p: Partial<WizardState>) => {
    setNotice(null);
    setEdited((s) => ({ ...(s ?? baseline!), ...p }));
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        definition: { ...definitionOf(state!), display: state!.query.display ?? DEFAULT_DISPLAY },
        // a drill-down draws each level by that level's own type; the chart's own is only "the page picks"
        chartType: state!.kind === 'drilldown' ? ('auto' as const) : state!.chartType,
        size: state!.size,
        title: effectiveTitle(fields, state!),
        visibility: (state!.shared ? 'workspace' : 'private') as 'workspace' | 'private',
      };
      return existing ? chartBuilderService.update(formId, existing._id, { ...payload, expectedVersion: existing.version }, scope) : chartBuilderService.create(formId, payload, scope);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chartKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['chart-data'] });
      toast(existing ? 'Chart updated.' : 'Chart added to the dashboard.', 'success');
      router.push(back);
    },
    onError: (e) =>
      toast(
        isAxiosError(e) && e.response?.status === 409 ? 'Someone else changed this chart. Reload it.' : getFriendlyErrorMessage(e, { action: 'save the chart', fallback: 'Couldn’t save the chart. Try again.' }),
        'error',
      ),
  });

  if (!form || !state || !scope || (chartId && !existing && !edited)) {
    return (
      <div className="flex flex-col gap-6" role="status" aria-label="Loading the chart builder">
        <Skeleton variant="title" width={200} height={28} />
        <Skeleton variant="block" height={320} className="w-full rounded-xl" />
      </div>
    );
  }

  const id = STEP_IDS[step];
  const drill = state.kind === 'drilldown';
  const headings = drill ? DRILL_HEADINGS : HEADINGS;
  const head = chartId ? { ...headings[id], title: id === 'kind' ? 'Edit chart' : drill ? 'Edit drill-down chart' : 'Edit simple chart' } : headings[id];
  const activeLevel = drill && focus.step === step ? Math.min(focus.level, state.levels.length - 1) : 0;
  const canShare = scope !== 'personal' && !!role && hasCapability(role, 'forms:edit');
  const steps = STEP_IDS.map((s, i) => ({
    label: stepLabel(s, state.kind),
    hint: stepHint(s, state.kind),
    value: i === 0 ? (drill ? 'Drill-down chart' : 'Simple chart') : i === 1 ? form.title : undefined,
  }));

  const leave = () => {
    if (isDirty(baseline!, state)) setConfirmLeave(true);
    else router.push(back);
  };
  const goBack = () => {
    setNotice(null);
    if (step === 0) leave();
    else setStep(step - 1);
  };
  const next = () => {
    const message = blockingMessage(id, fields, state);
    if (message) {
      setNotice(message);
      return;
    }
    setNotice(null);
    setStep(step + 1);
  };
  const last = step === STEP_IDS.length - 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="small" aria-label={step === 0 ? 'Leave the chart builder' : 'Back to the previous step'} onClick={goBack} className="mt-1 shrink-0">
          <ArrowLeft size={18} aria-hidden="true" />
        </Button>
        <PageHeader title={head.title} description={head.description} className="min-w-0 flex-1" />
      </div>

      {/* the steps stay out of the way on the first step (there is nothing to go back to yet) and sit in one row above the work after it */}
      {id !== 'kind' && <WizardSteps steps={steps} current={step} onGoTo={(i) => { setNotice(null); setStep(i); }} />}

      {id === 'kind' ? (
        <div className="flex min-w-0 flex-col gap-6">
          <h2 ref={heading} tabIndex={-1} className="bg-h4 font-bold text-(--text-primary) outline-none">
            {head.step}
          </h2>
          <StepKind
            value={state.kind}
            onChange={(kind) => patch({ kind })}
            onContinue={() => {
              setNotice(null);
              setStep(1);
            }}
          />
          {confirmLeave ? (
            <div role="alertdialog" aria-label="Discard this chart?" className="flex flex-wrap items-center gap-3">
              <p className="bg-body-sm font-medium text-(--text-primary)">Discard this chart?</p>
              <Button variant="secondary" size="small" onClick={() => setConfirmLeave(false)}>
                Keep editing
              </Button>
              <Button variant="destructive" size="small" onClick={() => router.push(back)}>
                Discard
              </Button>
            </div>
          ) : (
            <div>
              <Button variant="ghost" onClick={leave}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]">
            <Card className="flex min-w-0 flex-col gap-5 p-5 md:p-6">
              <header className="flex flex-col gap-1">
                <h2 ref={heading} tabIndex={-1} className="bg-h4 font-bold text-(--text-primary) outline-none">
                  {head.step}
                </h2>
                <p className="bg-body-sm text-(--text-muted)">{head.intro}</p>
              </header>
              {id === 'basics' && <StepBasics formTitle={form.title} scope={scope} fields={fields} state={state} onChange={patch} />}
              {id === 'configure' && <StepConfigure fields={fields} scope={scope} state={state} onChange={patch} activeLevel={activeLevel} onActiveLevel={(level) => setFocus({ step, level })} />}
              {id === 'save' && <StepSave state={state} onChange={patch} canShare={canShare} />}
            </Card>

            {/* the chart, beside the form on a wide screen (and in view while a long form scrolls), below it on a narrow one */}
            <div className="min-w-0 xl:sticky xl:top-20">
              {id === 'basics' && (drill ? <DrillPlaceholder /> : <ChartPreviewCard formId={formId} scope={scope} fields={fields} state={state} onChartType={(chartType) => patch({ chartType })} />)}
              {id === 'configure' && (drill ? <DrillPreviewCard formId={formId} scope={scope} fields={fields} state={state} level={activeLevel} onFull={() => setFocus({ step, level: 0 })} /> : <ChartPreviewCard formId={formId} scope={scope} fields={fields} state={state} />)}
              {id === 'save' && (
                // The card as the dashboard will draw it: inside a strip that stands for one row of the dashboard, at the width the chosen size gives it.
                <section aria-label="How it sits on the dashboard" className="flex flex-col gap-2">
                  <div className="rounded-xl border border-dashed border-(--border-default) bg-(--bg-subtle) p-3">
                    <div className="min-w-64 max-w-full" style={{ width: state.size === 'small' ? '34%' : state.size === 'medium' ? '51%' : '100%' }}>
                      {drill ? (
                        <DrillPreviewCard formId={formId} scope={scope} fields={fields} state={state} showPath />
                      ) : (
                        <ChartPreviewCard formId={formId} scope={scope} fields={fields} state={state} heading="Final preview" />
                      )}
                    </div>
                  </div>
                  <p className="bg-caption text-(--text-muted)">
                    On the dashboard this chart takes {state.size === 'small' ? 'a third of' : state.size === 'medium' ? 'half of' : 'all of'} a row.
                  </p>
                </section>
              )}
            </div>
          </div>

          {/* Back, Cancel and Next stay at the bottom of the screen while a long step scrolls, so they are never a scroll away; on a wide screen the bar is as wide as the form */}
          <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-xl border border-(--border-default) bg-(--surface-card) px-4 py-3 shadow-(--shadow-md) xl:max-w-xl">
            {notice && (
              <p role="alert" className="bg-body-sm font-medium text-(--danger-text)">
                {notice}
              </p>
            )}
            {confirmLeave ? (
              <div role="alertdialog" aria-label="Discard this chart?" className="flex flex-wrap items-center gap-3">
                <p className="bg-body-sm font-medium text-(--text-primary)">Discard this chart?</p>
                <Button variant="secondary" size="small" onClick={() => setConfirmLeave(false)}>
                  Keep editing
                </Button>
                <Button variant="destructive" size="small" onClick={() => router.push(back)}>
                  Discard
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={goBack}>
                  Back
                </Button>
                <Button variant="ghost" onClick={leave}>
                  Cancel
                </Button>
                <span className="flex-1" />
                {last ? (
                  <Button isLoading={save.isPending} onClick={() => save.mutate()}>
                    {existing ? 'Save changes' : 'Save to dashboard'}
                  </Button>
                ) : (
                  <Button onClick={next}>Next</Button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
