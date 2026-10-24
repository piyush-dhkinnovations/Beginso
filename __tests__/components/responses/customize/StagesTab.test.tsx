import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StagesTab } from '@/components/responses/customize/StagesTab';
import { toDraft, type Draft } from '@/components/responses/customize/draft';
import { DEFAULT_RESPONSE_SETUP } from '@/types/responseSetup';
import type { StageRef } from '@/types/stage';

const workspace: StageRef[] = [
  { id: 'w1', name: 'New', colour: 'neutral', category: 'new' },
  { id: 'w2', name: 'In Progress', colour: 'warning', category: 'in_progress' },
  { id: 'w3', name: 'Completed', colour: 'success', category: 'completed' },
];
const own = (): Draft => ({
  ...toDraft({ version: 1, setup: DEFAULT_RESPONSE_SETUP, stages: { mode: 'workspace', list: [], startIndex: null } }),
  stagesMode: 'own',
  stages: workspace.map((s) => ({ name: s.name, colour: s.colour, category: s.category })),
});

function setup(draft: Draft, personal = false) {
  const onChange = vi.fn();
  render(<StagesTab draft={draft} onChange={onChange} personal={personal} workspaceStages={workspace} />);
  return onChange;
}

describe('StagesTab', () => {
  it('a personal form is told it uses the three standard stages, and offers no choice', () => {
    setup(own(), true);
    expect(screen.getByText('Personal forms use the three standard stages')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('offers the workspace stages (named) or stages of its own', async () => {
    const draft = { ...own(), stagesMode: 'workspace' as const, stages: [] };
    const onChange = setup(draft);
    expect(screen.getByRole('radio', { name: /Use the workspace stages/ })).toBeChecked();
    expect(screen.getByText(/New · In Progress · Completed/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Name of stage 1')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /This form has its own stages/ }));
    // the list it starts with is a copy of the workspace's stages
    const next = onChange.mock.calls.at(-1)![0];
    expect(next.stagesMode).toBe('own');
    expect(next.stages.map((s: { name: string }) => s.name)).toEqual(['New', 'In Progress', 'Completed']);
  });

  it('lists the form\'s stages with a name, a colour and what each counts as', () => {
    setup(own());
    expect(screen.getByLabelText('Name of stage 2')).toHaveValue('In Progress');
    expect(screen.getByLabelText('In Progress counts as')).toHaveValue('in_progress');
    expect(screen.getByLabelText('Colour of In Progress')).toHaveValue('warning');
  });

  it('renaming, recolouring and re-categorising a stage report the new draft', async () => {
    const onChange = setup(own());
    await userEvent.type(screen.getByLabelText('Name of stage 1'), 'X');
    expect(onChange.mock.calls.at(-1)![0].stages[0].name).toBe('NewX');
    await userEvent.selectOptions(screen.getByLabelText('Colour of In Progress'), 'error');
    expect(onChange.mock.calls.at(-1)![0].stages[1].colour).toBe('error');
    await userEvent.selectOptions(screen.getByLabelText('Completed counts as'), 'in_progress');
    expect(onChange.mock.calls.at(-1)![0].stages[2].category).toBe('in_progress');
  });

  it('adds, moves and deletes stages; the first cannot go up, the last cannot go down, and the only one cannot be deleted', async () => {
    const onChange = setup(own());
    expect(screen.getByRole('button', { name: 'Move New up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Completed down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move New down' }));
    expect(onChange.mock.calls.at(-1)![0].stages.map((s: { name: string }) => s.name)).toEqual(['In Progress', 'New', 'Completed']);
    await userEvent.click(screen.getByRole('button', { name: 'Delete In Progress' }));
    expect(onChange.mock.calls.at(-1)![0].stages.map((s: { name: string }) => s.name)).toEqual(['New', 'Completed']);
    await userEvent.click(screen.getByRole('button', { name: 'Add a stage' }));
    expect(onChange.mock.calls.at(-1)![0].stages).toHaveLength(4);
  });

  it('cannot delete the last stage, and an unnamed stage asks for a name', () => {
    const d = own();
    setup({ ...d, stages: [{ name: '', colour: 'info', category: 'new' }] });
    expect(screen.getByRole('button', { name: /^Delete/ })).toBeDisabled();
    expect(screen.getByText('Give the stage a name')).toBeInTheDocument();
  });

  it('stops offering more stages at twelve', () => {
    const d = own();
    setup({ ...d, stages: Array.from({ length: 12 }, (_, i) => ({ name: `S${i}`, colour: 'info' as const, category: 'new' as const })) });
    expect(screen.getByRole('button', { name: 'Add a stage' })).toBeDisabled();
    expect(screen.getByText('A form can have up to 12 stages.')).toBeInTheDocument();
  });
});
