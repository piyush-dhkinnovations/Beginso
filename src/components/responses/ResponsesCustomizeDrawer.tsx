'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { useStages } from '@/hooks/useStages';
import { useResponseSetup } from '@/hooks/useResponseSetup';
import { responseSetupService } from '@/services/responseSetup';
import { responseKeys, responseSetupKeys } from '@/lib/queryKeys';
import { StagesTab } from './customize/StagesTab';
import { ColumnsTab } from './customize/ColumnsTab';
import { BoardCardTab } from './customize/BoardCardTab';
import { DefaultsTab } from './customize/DefaultsTab';
import { usePreviewResponses } from './customize/usePreviewResponses';
import { changesStages, defaultDraft, isDirty, problems, toDraft, toInput, type Draft } from './customize/draft';
import { isStageColorToken, type StageRef } from '@/types/stage';
import type { FormField } from '@/types/form';
import type { ResponseSetup } from '@/types/responseSetup';

type TabId = 'stages' | 'columns' | 'card' | 'defaults';
const TABS: { id: TabId; label: string }[] = [
  { id: 'stages', label: 'Stages' },
  { id: 'columns', label: 'Table columns' },
  { id: 'card', label: 'Board card' },
  { id: 'defaults', label: 'Defaults' },
];

export interface ResponsesCustomizeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  /** Workspace slug, or `personal`. */
  scope: string;
  fields: readonly FormField[] | undefined;
  /** How many responses the form has: a change of stages tells the person that many will move. */
  responseCount?: number;
}

/**
 * "Customize" on a form's Responses page: the form's own stages, its table columns, its board card and a few defaults, in one panel
 * for owners and admins. The panel edits a copy; the page behind it changes only when Save is pressed (one request, checked by the
 * server), and Cancel throws the copy away.
 */
export function ResponsesCustomizeDrawer(props: ResponsesCustomizeDrawerProps) {
  const { data: saved } = useResponseSetup(props.formId);
  if (!props.isOpen) return null;
  if (!saved) {
    return (
      <Drawer isOpen onClose={props.onClose} width={940} title="Customize responses" description="For this form only. Owners and admins can change it.">
        <Skeleton variant="block" height={240} className="rounded-xl" />
      </Drawer>
    );
  }
  return <OpenDrawer {...props} saved={saved} />;
}

function OpenDrawer({ onClose, formId, scope, fields, responseCount = 0, saved }: ResponsesCustomizeDrawerProps & { saved: ResponseSetup }) {
  const personal = scope === 'personal';
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: workspaceStages = [] } = useStages(personal ? undefined : scope);

  const [baseline, setBaseline] = useState<Draft>(() => toDraft(saved));
  const [draft, setDraft] = useState<Draft>(baseline);
  const [tab, setTab] = useState<TabId>('stages');
  const [confirm, setConfirm] = useState<'discard' | 'stages' | null>(null);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = isDirty(draft, baseline);
  const issues = problems(draft);

  // The stage a preview response sits in: the form's first stage as the draft has it.
  const firstStage: StageRef | undefined = (() => {
    const s = draft.stagesMode === 'own' ? draft.stages[0] : workspaceStages[0];
    return s ? { id: ('id' in s && s.id) || 'preview', name: s.name.trim() || 'Stage', colour: isStageColorToken(s.colour) ? s.colour : 'neutral', category: s.category } : undefined;
  })();
  const preview = usePreviewResponses({ scope, formId, fields, stage: firstStage, enabled: tab === 'columns' || tab === 'card' });
  const workspaceStartName = (workspaceStages.find((s) => s.category === 'new') ?? workspaceStages[0])?.name ?? 'New';

  const save = useMutation({
    mutationFn: () => responseSetupService.save(formId, toInput(draft, saved.version)),
    onSuccess: (next) => {
      queryClient.setQueryData(responseSetupKeys.form(formId), next);
      // Stages may have moved responses, and the table, board and counts read them.
      void queryClient.invalidateQueries({ queryKey: responseKeys.all(scope, formId) });
      toast('Saved. This form now uses your setup.', 'success');
      onClose();
    },
    onError: (e: unknown) => {
      const res = (e as { response?: { status?: number; data?: { message?: string } } }).response;
      if (res?.status === 409) setConflict(true);
      else setError(res?.data?.message ?? 'Could not save. Please try again.');
    },
  });

  const requestSave = () => {
    setError(null);
    if (issues.length > 0) return;
    if (changesStages(draft, baseline) && responseCount > 0) setConfirm('stages');
    else save.mutate();
  };
  const requestClose = () => (dirty ? setConfirm('discard') : onClose());

  async function loadLatest() {
    const latest = await responseSetupService.get(formId);
    queryClient.setQueryData(responseSetupKeys.form(formId), latest);
    const fresh = toDraft(latest);
    setBaseline(fresh);
    setDraft(fresh);
    setConflict(false);
    setError(null);
  }

  const footer = (
    <div className="flex w-full flex-wrap items-center gap-3">
      <Button variant="ghost" size="small" onClick={() => setDraft(defaultDraft())}>
        Reset to defaults
      </Button>
      <span className={dirty ? 'rounded-full bg-(--warning-surface) px-2.5 py-0.5 bg-caption font-medium text-(--warning-text)' : 'bg-caption text-(--text-muted)'} role="status">
        {dirty ? 'Not saved yet' : 'No changes'}
      </span>
      <span className="flex-1" />
      <Button variant="secondary" onClick={requestClose}>
        Cancel
      </Button>
      <Button onClick={requestSave} isLoading={save.isPending} disabled={!dirty || issues.length > 0 || conflict}>
        Save changes
      </Button>
    </div>
  );

  return (
    <>
      <Drawer isOpen onClose={requestClose} width={940} title="Customize responses" description="For this form only. Owners and admins can change it." footer={footer}>
        {/* The tabs stay at the top while a long list scrolls under them. */}
        <div className="sticky -top-(--space-5) z-10 -mx-(--space-5) -mt-(--space-5) bg-(--surface-card) px-(--space-5) pt-(--space-3)">
          <Tabs tabs={TABS} activeId={tab} onChange={(id) => setTab(id as TabId)} ariaLabel="What to customize" panelId="customize-panel" />
        </div>

        {conflict && (
          <Alert variant="warning" title="Someone else changed this setup first">
            Load their version to see it, then make your changes again.
            <div className="mt-2">
              <Button variant="secondary" size="small" onClick={() => void loadLatest()}>
                Load the latest
              </Button>
            </div>
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}
        {issues.length > 0 && dirty && (
          <Alert variant="warning">
            {issues.map((i) => (
              <span key={i} className="block">{i}</span>
            ))}
          </Alert>
        )}

        <div role="tabpanel" id="customize-panel" aria-labelledby={`tab-${tab}`} className="flex flex-col gap-4">
          {tab === 'stages' && <StagesTab draft={draft} onChange={setDraft} personal={personal} workspaceStages={workspaceStages} />}
          {tab === 'columns' && <ColumnsTab draft={draft} onChange={setDraft} fields={fields} previewRows={preview.responses} previewIsSample={preview.isSample} />}
          {tab === 'card' && <BoardCardTab draft={draft} onChange={setDraft} fields={fields} previewRows={preview.responses} previewIsSample={preview.isSample} stage={firstStage} />}
          {tab === 'defaults' && <DefaultsTab draft={draft} onChange={setDraft} fields={fields} workspaceStartName={workspaceStartName} />}
        </div>
      </Drawer>

      <Modal overDrawer isOpen={confirm === 'discard'} onClose={() => setConfirm(null)} title="Discard your changes?" description="Nothing you changed here has been saved.">
        <div className="bg-modal-foot -mx-(--space-5) -mb-(--space-5)">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Keep editing
          </Button>
          <Button variant="destructive" onClick={onClose}>
            Discard changes
          </Button>
        </div>
      </Modal>

      <Modal
        overDrawer
        isOpen={confirm === 'stages'}
        onClose={() => setConfirm(null)}
        title="Move the responses to the new stages?"
        description={`This form has ${responseCount} response${responseCount === 1 ? '' : 's'}. Each one moves to the first stage that counts the same way (New, In progress or Completed), or to the first stage if there is none. You can change a response's stage afterwards.`}
      >
        <div className="bg-modal-foot -mx-(--space-5) -mb-(--space-5)">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Go back
          </Button>
          <Button
            onClick={() => {
              setConfirm(null);
              save.mutate();
            }}
          >
            Save and move them
          </Button>
        </div>
      </Modal>
    </>
  );
}
