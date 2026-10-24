import { describe, it, expect } from 'vitest';
import { addStage, changesStages, copyStages, defaultDraft, isDirty, moveItem, moveStage, problems, removeStage, toDraft, toInput } from '@/components/responses/customize/draft';
import { DEFAULT_RESPONSE_SETUP, type ResponseSetup } from '@/types/responseSetup';
import type { StageRef } from '@/types/stage';

const workspace: StageRef[] = [
  { id: 'w1', name: 'New', colour: 'neutral', category: 'new' },
  { id: 'w2', name: 'In Progress', colour: 'warning', category: 'in_progress' },
  { id: 'w3', name: 'Completed', colour: 'success', category: 'completed' },
];
const savedWorkspace: ResponseSetup = { version: 0, setup: DEFAULT_RESPONSE_SETUP, stages: { mode: 'workspace', list: [], startIndex: null } };
const savedOwn: ResponseSetup = {
  version: 3,
  setup: { ...DEFAULT_RESPONSE_SETUP, tableColumns: ['respondent', 'q:f1'], cardTitle: 'f1' },
  stages: {
    mode: 'own',
    startIndex: 1,
    list: [
      { id: 'a', name: 'Received', colour: 'neutral', category: 'new', order: 0, isDefault: false },
      { id: 'b', name: 'Screening', colour: 'slate', category: 'in_progress', order: 1, isDefault: true },
      { id: 'c', name: 'Selected', colour: 'success', category: 'completed', order: 2, isDefault: false },
    ],
  },
};

describe('toDraft', () => {
  it('a form on the workspace stages has no list of its own yet, and nothing is changed', () => {
    const d = toDraft(savedWorkspace);
    expect(d.stagesMode).toBe('workspace');
    expect(d.stages).toEqual([]);
    expect(isDirty(d, toDraft(savedWorkspace))).toBe(false);
  });

  it('copyStages starts the own list of a form from the workspace stages, without their ids', () => {
    const copy = copyStages(workspace);
    expect(copy.map((s) => s.name)).toEqual(['New', 'In Progress', 'Completed']);
    expect(copy.every((s) => s.id === undefined)).toBe(true); // copies, not the workspace's own rows
  });

  it('a form with its own stages keeps their ids, an unknown colour becomes grey, and the start stage is remembered', () => {
    const d = toDraft(savedOwn);
    expect(d.stagesMode).toBe('own');
    expect(d.stages.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(d.stages[1].colour).toBe('neutral'); // "slate" is not one of the colours the panel offers
    expect(d.startIndex).toBe(1);
    expect(d.values.tableColumns).toEqual(['respondent', 'q:f1']);
  });
});

describe('toInput', () => {
  it('sends the workspace mode without any stages', () => {
    expect(toInput(toDraft(savedWorkspace), 0).stages).toEqual({ mode: 'workspace' });
  });

  it('sends own stages with their ids, trimmed names and the start position, plus the version it loaded', () => {
    const d = toDraft(savedOwn);
    d.stages[0].name = '  Inbox ';
    const input = toInput(d, 3);
    expect(input.version).toBe(3);
    expect(input.tableColumns).toEqual(['respondent', 'q:f1']);
    expect(input.stages).toMatchObject({ mode: 'own', startIndex: 1 });
    expect((input.stages as { stages: { id?: string; name: string }[] }).stages[0]).toMatchObject({ id: 'a', name: 'Inbox' });
  });
});

describe('isDirty and changesStages', () => {
  it('stages typed while the form uses the workspace stages are not a change', () => {
    const base = toDraft(savedWorkspace);
    const typed = { ...base, stages: [...base.stages, { name: 'Extra', colour: 'info' as const, category: 'new' as const }] };
    expect(isDirty(typed, base)).toBe(false);
    expect(changesStages(typed, base)).toBe(false);
  });

  it('switching to own stages, or editing them, is a change of stages; a column change is not', () => {
    const base = toDraft(savedWorkspace);
    expect(changesStages({ ...base, stagesMode: 'own' }, base)).toBe(true);
    const own = toDraft(savedOwn);
    expect(changesStages({ ...own, stages: own.stages.slice(0, 2) }, own)).toBe(true);
    const columns = { ...own, values: { ...own.values, tableColumns: ['respondent'] } };
    expect(isDirty(columns, own)).toBe(true);
    expect(changesStages(columns, own)).toBe(false);
  });
});

describe('problems', () => {
  it('names what stops a save', () => {
    const d = toDraft(savedOwn);
    expect(problems(d)).toEqual([]);
    expect(problems({ ...d, values: { ...d.values, tableColumns: [] } })).toEqual(['Show at least one column in the table.']);
    expect(problems({ ...d, stages: [{ ...d.stages[0], name: '  ' }] })).toEqual(['Every stage needs a name.']);
    // empty stage names do not matter while the workspace stages are in use
    expect(problems({ ...d, stagesMode: 'workspace', stages: [{ ...d.stages[0], name: '' }] })).toEqual([]);
  });
});

describe('editing the list', () => {
  it('moveItem moves within bounds and leaves the list alone outside them', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 2)).toEqual(['a', 'b']);
  });

  it('moving a stage keeps "new responses start in" on the same stage', () => {
    const d = toDraft(savedOwn); // starts in Screening (index 1)
    const up = moveStage(d, 1, 0);
    expect(up.stages.map((s) => s.name)).toEqual(['Screening', 'Received', 'Selected']);
    expect(up.startIndex).toBe(0);
    const other = moveStage(d, 0, 1); // Received moves past Screening
    expect(other.stages.map((s) => s.name)).toEqual(['Screening', 'Received', 'Selected']);
    expect(other.startIndex).toBe(0);
    const past = moveStage(d, 2, 0); // Selected jumps in front of both
    expect(past.stages[past.startIndex].name).toBe('Screening');
  });

  it('removing a stage keeps the start on the same stage, or on the first when the start itself goes, and never empties the list', () => {
    const d = toDraft(savedOwn);
    expect(removeStage(d, 0).stages[removeStage(d, 0).startIndex].name).toBe('Screening');
    expect(removeStage(d, 1).startIndex).toBe(0);
    expect(removeStage({ ...d, stages: [d.stages[0]], startIndex: 0 }, 0).stages).toHaveLength(1);
  });

  it('adding a stage appends an unnamed one that counts as in progress', () => {
    const d = addStage(toDraft(savedOwn));
    expect(d.stages).toHaveLength(4);
    expect(d.stages[3]).toEqual({ name: '', colour: 'info', category: 'in_progress' });
  });

  it('defaultDraft is the workspace stages and today\'s setup', () => {
    const d = defaultDraft();
    expect(d.stagesMode).toBe('workspace');
    expect(d.values).toEqual(DEFAULT_RESPONSE_SETUP);
  });
});
