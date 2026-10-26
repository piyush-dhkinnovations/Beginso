import { DEFAULT_RESPONSE_SETUP, type EditableStage, type ResponseSetup, type ResponseSetupValues, type SaveResponseSetupInput } from '@/types/responseSetup';
import { isStageColorToken, type StageRef } from '@/types/stage';

/**
 * What the Customize panel edits. Nothing here reaches the page until the person presses Save: the panel works on this copy, and
 * Cancel simply throws it away.
 */
export interface Draft {
  stagesMode: 'workspace' | 'own';
  /** The form's own stages. Kept while the mode is `workspace` too, so switching back and forth loses nothing typed. */
  stages: EditableStage[];
  /** Position, in `stages`, of the stage new responses start in. */
  startIndex: number;
  values: ResponseSetupValues;
}

const asEditable = (s: { id?: string; name: string; colour: string; category: EditableStage['category'] }): EditableStage => ({
  ...(s.id ? { id: s.id } : {}),
  name: s.name,
  colour: isStageColorToken(s.colour) ? s.colour : 'neutral',
  category: s.category,
});

/** A copy of the workspace's stages, as the starting list for a form that is about to get stages of its own. */
export const copyStages = (workspaceStages: readonly StageRef[]): EditableStage[] =>
  workspaceStages.map((s) => asEditable({ name: s.name, colour: s.colour, category: s.category }));

/** The panel's starting point: the form's saved setup. A form on the workspace stages has no list of its own until it asks for one. */
export function toDraft(saved: ResponseSetup): Draft {
  const own = saved.stages.mode === 'own';
  return {
    stagesMode: own ? 'own' : 'workspace',
    stages: own ? saved.stages.list.map(asEditable) : [],
    startIndex: own ? Math.max(0, saved.stages.startIndex ?? 0) : 0,
    values: { ...saved.setup, tableColumns: [...saved.setup.tableColumns] },
  };
}

/** "Reset to defaults": the workspace's stages and the setup every form starts with. */
export function defaultDraft(): Draft {
  return toDraft({ version: 0, setup: DEFAULT_RESPONSE_SETUP, stages: { mode: 'workspace', list: [], startIndex: null } });
}

export function toInput(draft: Draft, version: number): SaveResponseSetupInput {
  return {
    version,
    ...draft.values,
    stages:
      draft.stagesMode === 'own'
        ? { mode: 'own', stages: draft.stages.map((s) => ({ ...s, name: s.name.trim() })), startIndex: Math.min(draft.startIndex, draft.stages.length - 1) }
        : { mode: 'workspace' },
  };
}

/** The part of a draft that decides what gets saved: stages only count while the form uses its own. */
const effective = (d: Draft) => ({ ...d.values, stagesMode: d.stagesMode, ...(d.stagesMode === 'own' ? { stages: d.stages, startIndex: d.startIndex } : {}) });

export const isDirty = (a: Draft, b: Draft): boolean => JSON.stringify(effective(a)) !== JSON.stringify(effective(b));

/** Whether saving changes which stages the form's responses sit on (so the person should be told responses will move). */
export const changesStages = (a: Draft, b: Draft): boolean =>
  a.stagesMode !== b.stagesMode || (a.stagesMode === 'own' && JSON.stringify(a.stages) !== JSON.stringify(b.stages));

/** What stops a draft from being saved, in the words shown to the person. */
export function problems(draft: Draft): string[] {
  const out: string[] = [];
  if (draft.values.tableColumns.length === 0) out.push('Show at least one column in the table.');
  if (draft.stagesMode === 'own') {
    if (draft.stages.length === 0) out.push('A form needs at least one stage.');
    if (draft.stages.some((s) => s.name.trim() === '')) out.push('Every stage needs a name.');
  }
  return out;
}

/** Puts the column `active` where the column `over` is (a drag from one row to another); a key that is not in the list leaves it alone. */
export function moveColumn<T>(list: readonly T[], active: T, over: T): T[] {
  const from = list.indexOf(active);
  const to = list.indexOf(over);
  return from === -1 || to === -1 ? [...list] : moveItem(list, from, to);
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Moving a stage must keep "starts in" on the same stage, not on the same position. */
export function moveStage(draft: Draft, from: number, to: number): Draft {
  if (to < 0 || to >= draft.stages.length) return draft;
  const startIndex = draft.startIndex === from ? to : from < draft.startIndex && to >= draft.startIndex ? draft.startIndex - 1 : from > draft.startIndex && to <= draft.startIndex ? draft.startIndex + 1 : draft.startIndex;
  return { ...draft, stages: moveItem(draft.stages, from, to), startIndex };
}

export function removeStage(draft: Draft, index: number): Draft {
  if (draft.stages.length <= 1) return draft;
  const stages = draft.stages.filter((_, i) => i !== index);
  const startIndex = draft.startIndex === index ? 0 : draft.startIndex > index ? draft.startIndex - 1 : draft.startIndex;
  return { ...draft, stages, startIndex: Math.min(startIndex, stages.length - 1) };
}

export function addStage(draft: Draft): Draft {
  return { ...draft, stages: [...draft.stages, { name: '', colour: 'info', category: 'in_progress' }] };
}
