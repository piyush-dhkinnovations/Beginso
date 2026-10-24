'use client';

import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Radio } from '@/components/ui/Radio';
import { Menu } from '@/components/ui/Menu';
import { Select } from '@/components/ui/Select';
import { StageDot } from '../StageDot';
import { STAGE_COLOR_TOKENS, CATEGORY_LABELS, type StageCategory, type StageColorToken, type StageRef } from '@/types/stage';
import { addStage, copyStages, moveStage, removeStage, type Draft } from './draft';
import { MAX_FORM_STAGES } from './limits';

interface StagesTabProps {
  draft: Draft;
  onChange: (next: Draft) => void;
  /** A personal form has no workspace, so no stages of its own. */
  personal: boolean;
  workspaceStages: readonly StageRef[];
}

const Dot = StageDot;

const COLOUR_LABEL: Record<StageColorToken, string> = {
  neutral: 'Grey',
  primary: 'Blue',
  info: 'Light blue',
  success: 'Green',
  warning: 'Orange',
  error: 'Red',
};

/** Which stages this form uses: the workspace's, or a list of its own. */
export function StagesTab({ draft, onChange, personal, workspaceStages }: StagesTabProps) {
  // A stage that was just added gets the cursor, so it can be named at once (and is scrolled into view).
  const count = useRef(draft.stages.length);
  useEffect(() => {
    if (draft.stages.length > count.current) {
      const input = document.getElementById(`stage-name-${draft.stages.length - 1}`);
      input?.focus();
      input?.scrollIntoView?.({ block: 'nearest' });
    }
    count.current = draft.stages.length;
  }, [draft.stages.length]);

  if (personal) {
    return (
      <Alert variant="info" title="Personal forms use the three standard stages">
        New, In Progress and Completed. Move the form to a workspace to give it stages of its own.
      </Alert>
    );
  }

  const own = draft.stagesMode === 'own';
  const setStage = (index: number, patch: Partial<Draft['stages'][number]>) =>
    onChange({ ...draft, stages: draft.stages.map((s, i) => (i === index ? { ...s, ...patch } : s)) });

  return (
    <div className="flex flex-col gap-6">
      <div role="radiogroup" aria-label="Which stages this form uses" className="flex flex-col gap-3">
        <div className="rounded-xl border border-(--border-default) p-4 has-checked:border-(--action-primary) has-checked:bg-(--accent-soft)">
          <Radio
            id="stages-workspace"
            name="stages-mode"
            checked={!own}
            onChange={() => onChange({ ...draft, stagesMode: 'workspace' })}
            label="Use the workspace stages"
            description={`${workspaceStages.map((s) => s.name).join(' · ')}. Change them once in Settings and every form that uses them follows.`}
          />
        </div>
        <div className="rounded-xl border border-(--border-default) p-4 has-checked:border-(--action-primary) has-checked:bg-(--accent-soft)">
          <Radio
            id="stages-own"
            name="stages-mode"
            checked={own}
            // The list starts as a copy of the workspace's stages, so the form keeps working the moment it is saved.
            onChange={() => onChange({ ...draft, stagesMode: 'own', stages: draft.stages.length > 0 ? draft.stages : copyStages(workspaceStages) })}
            label="This form has its own stages"
            description="Only this form. Other forms are not touched."
          />
        </div>
      </div>

      {own && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="bg-body font-semibold text-(--text-primary)">Stages of this form, left to right</h3>
            <p className="bg-body-sm text-(--text-muted)">
              &ldquo;Counts as&rdquo; keeps counts and charts working across forms. Responses already in this form move to the first stage that counts the same way.
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {draft.stages.map((stage, index) => (
              <li key={stage.id ?? `new-${index}`} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-(--border-default) bg-(--surface-card) p-3 md:grid-cols-[auto_auto_minmax(0,1fr)_12rem_auto]">
                <div className="flex items-center gap-1 pt-1">
                  <Button variant="ghost" size="small" aria-label={`Move ${stage.name || 'stage'} up`} disabled={index === 0} onClick={() => onChange(moveStage(draft, index, index - 1))}>
                    <ArrowUp size={14} aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="small" aria-label={`Move ${stage.name || 'stage'} down`} disabled={index === draft.stages.length - 1} onClick={() => onChange(moveStage(draft, index, index + 1))}>
                    <ArrowDown size={14} aria-hidden="true" />
                  </Button>
                </div>
                <Menu
                  triggerLabel={`Colour of ${stage.name || 'stage'}: ${COLOUR_LABEL[stage.colour]}. Press to change it.`}
                  triggerClassName="bg-btn bg-btn-ghost bg-btn-sm mt-1"
                  trigger={<Dot colour={stage.colour} size={16} />}
                  items={STAGE_COLOR_TOKENS.map((token) => ({
                    id: token,
                    label: COLOUR_LABEL[token],
                    icon: <Dot colour={token} />,
                    onSelect: () => setStage(index, { colour: token }),
                  }))}
                />
                <Input
                  id={`stage-name-${index}`}
                  aria-label={`Name of stage ${index + 1}`}
                  placeholder="Name of the stage"
                  maxLength={60}
                  value={stage.name}
                  onChange={(e) => setStage(index, { name: e.target.value })}
                  error={stage.name.trim() === '' ? 'Give the stage a name' : undefined}
                />
                <Select id={`stage-category-${index}`} aria-label={`${stage.name || 'Stage'} counts as`} value={stage.category} onChange={(e) => setStage(index, { category: e.target.value as StageCategory })}>
                  {(Object.keys(CATEGORY_LABELS) as StageCategory[]).map((c) => (
                    <option key={c} value={c}>
                      Counts as {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </Select>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant={stage.colour} dot pill>
                    {stage.name.trim() || 'Stage'}
                  </Badge>
                  <Button variant="ghost" size="small" aria-label={`Delete ${stage.name || 'stage'}`} disabled={draft.stages.length === 1} onClick={() => onChange(removeStage(draft, index))}>
                    <X size={14} aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" size="small" disabled={draft.stages.length >= MAX_FORM_STAGES} onClick={() => onChange(addStage(draft))}>
              <Plus size={14} className="mr-1.5" aria-hidden="true" />
              Add a stage
            </Button>
            {draft.stages.length >= MAX_FORM_STAGES && <span className="bg-caption text-(--text-muted)">A form can have up to {MAX_FORM_STAGES} stages.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
