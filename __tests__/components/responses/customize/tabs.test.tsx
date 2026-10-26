import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColumnsTab } from '@/components/responses/customize/ColumnsTab';
import { BoardCardTab } from '@/components/responses/customize/BoardCardTab';
import { DefaultsTab } from '@/components/responses/customize/DefaultsTab';
import { toDraft, type Draft } from '@/components/responses/customize/draft';
import { sampleResponses } from '@/components/responses/customize/usePreviewResponses';
import { DEFAULT_RESPONSE_SETUP } from '@/types/responseSetup';
import type { FormField } from '@/types/form';
import type { IResponse } from '@/types/response';

vi.mock('@/hooks/useFormFields', () => ({ useFormFields: () => FIELDS }));

const field = (fieldId: string, label: string, type: FormField['type'] = 'short_text') =>
  ({ fieldId, label, type, pageId: 'p', required: false, deleted: false, order: 0 }) as FormField;
const FIELDS = [field('n', 'Full name'), field('film', 'Title of the film'), field('genre', 'Genre'), field('sig', 'Signature', 'signature')];

const draft = (over: Partial<Draft['values']> = {}, extra: Partial<Draft> = {}): Draft => ({
  ...toDraft({ version: 1, setup: { ...DEFAULT_RESPONSE_SETUP, ...over }, stages: { mode: 'workspace', list: [], startIndex: null } }),
  ...extra,
});
const rows: IResponse[] = sampleResponses('f1', FIELDS, undefined);

describe('ColumnsTab', () => {
  const setup = (d: Draft) => {
    const onChange = vi.fn();
    render(<ColumnsTab draft={d} onChange={onChange} fields={FIELDS} previewRows={rows} previewIsSample />);
    return onChange;
  };
  const last = (onChange: ReturnType<typeof vi.fn>): string[] => onChange.mock.calls.at(-1)![0].values.tableColumns;

  it('lists the shown columns in order, and offers every column that is not shown (built-in ones and text questions)', () => {
    setup(draft());
    const shownList = screen.getByRole('heading', { name: 'Shown in the table, left to right' }).closest('section')!;
    expect(within(shownList).getAllByRole('listitem').map((li) => li.textContent?.replace(/Question$/, '').trim())).toEqual(
      ['Respondent', 'Email', 'Tags', 'Assignee', 'Stage', 'Submitted'].map((n) => n)
    );
    const add = screen.getByRole('heading', { name: 'Add a column' }).closest('section')!;
    const offered = within(add).getAllByRole('button').map((b) => b.textContent?.trim());
    // four buttons, the rest behind More; Signature is not offered at all (it is not text)
    expect(offered).toEqual(['Average score', 'Notes', 'Reference ID', 'Full name', 'More (2)']);
  });

  it('offers only four columns as buttons and keeps the rest behind More, which adds the one chosen', async () => {
    const onChange = setup(draft());
    expect(screen.queryByRole('button', { name: 'Genre' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'More columns, 2' }));
    await userEvent.click(screen.getByRole('button', { name: 'Genre' }));
    expect(last(onChange)).toEqual(['respondent', 'email', 'tags', 'assignee', 'stage', 'submitted', 'q:genre']);
  });

  it('More opens a short list you can search, and says when nothing matches', async () => {
    setup(draft({ tableColumns: ['respondent'] }));
    await userEvent.click(screen.getByRole('button', { name: /More columns/ }));
    const search = screen.getByRole('textbox', { name: 'Search the other columns' });
    const list = search.closest('div[id="more-columns"]') as HTMLElement;
    expect(within(list).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['Submitted', 'Average score', 'Notes', 'Reference ID', 'Full name', 'Title of the film', 'Genre']);
    await userEvent.type(search, 'tit');
    expect(within(list).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['Title of the film']);
    await userEvent.clear(search);
    await userEvent.type(search, 'zzz');
    expect(screen.getByText(/No column matches/)).toBeInTheDocument();
  });

  it('has no More button when four or fewer are left', () => {
    setup(draft({ tableColumns: ['respondent', 'email', 'tags', 'assignee', 'stage', 'submitted', 'score', 'notes'] }));
    expect(screen.queryByRole('button', { name: /More columns/ })).not.toBeInTheDocument();
  });

  it('adds a question as the last column', async () => {
    const onChange = setup(draft());
    await userEvent.click(screen.getByRole('button', { name: 'More columns, 2' }));
    await userEvent.click(screen.getByRole('button', { name: 'Title of the film' }));
    expect(last(onChange)).toEqual(['respondent', 'email', 'tags', 'assignee', 'stage', 'submitted', 'q:film']);
  });

  it('every column has a drag handle (not up / down arrows), and a column can be removed', async () => {
    const onChange = setup(draft());
    expect(screen.getByRole('button', { name: 'Move Email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Respondent' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move .* (left|right)/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Tags' }));
    expect(last(onChange)).not.toContain('tags');
  });

  it('the first column of the preview carries the picture, whichever column that is', () => {
    setup(draft({ tableColumns: ['q:film', 'respondent'] }));
    const table = screen.getByRole('region', { name: 'Table preview' });
    const firstRow = within(table).getAllByRole('row')[1];
    const [first, second] = within(firstRow).getAllByRole('cell');
    expect(first.querySelector('.bg-avatar')).not.toBeNull();
    expect(second.querySelector('.bg-avatar')).toBeNull();
  });

  it('keeps the last column: it cannot be removed', () => {
    setup(draft({ tableColumns: ['respondent'] }));
    expect(screen.getByRole('button', { name: 'Remove Respondent' })).toBeDisabled();
  });

  it('shows a column for a question that has since been deleted nowhere', () => {
    setup(draft({ tableColumns: ['respondent', 'q:gone'] }));
    expect(screen.queryByText('q:gone')).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(1);
  });

  it('previews the table with the chosen columns, and says when the rows are examples', () => {
    setup(draft({ tableColumns: ['respondent', 'q:film'] }));
    const table = screen.getByRole('region', { name: 'Table preview' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Respondent', 'Title of the film']);
    expect(within(table).getAllByRole('row')).toHaveLength(1 + rows.length);
    expect(screen.getByText(/these are examples/)).toBeInTheDocument();
  });
});

describe('BoardCardTab', () => {
  it('offers the text questions as the card title, and reports the choice', async () => {
    const onChange = vi.fn();
    render(<BoardCardTab draft={draft()} onChange={onChange} fields={FIELDS} previewRows={rows} previewIsSample stage={undefined} />);
    const select = screen.getByLabelText('Card title') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.text)).toEqual(['Respondent name, or email', 'Full name', 'Title of the film', 'Genre']);
    await userEvent.selectOptions(select, 'film');
    expect(onChange.mock.calls.at(-1)![0].values.cardTitle).toBe('film');
  });

  it('previews the real card with the chosen question as its title', () => {
    render(<BoardCardTab draft={draft({ cardTitle: 'genre' })} onChange={vi.fn()} fields={FIELDS} previewRows={rows} previewIsSample stage={undefined} />);
    const preview = screen.getByRole('group', { name: 'Card preview' });
    expect(within(preview).getAllByText('Sample answer 1').length).toBeGreaterThan(0);
  });
});

describe('DefaultsTab', () => {
  const setup = (d: Draft) => {
    const onChange = vi.fn();
    render(<DefaultsTab draft={d} onChange={onChange} fields={FIELDS} workspaceStartName="New" />);
    return onChange;
  };

  it('chooses how the page opens, its order, the row height and wrapping', async () => {
    const onChange = setup(draft());
    await userEvent.selectOptions(screen.getByLabelText('Opens as'), 'board');
    expect(onChange.mock.calls.at(-1)![0].values.opensAs).toBe('board');
    await userEvent.selectOptions(screen.getByLabelText('Sorted by'), 'oldest');
    expect(onChange.mock.calls.at(-1)![0].values.sort).toBe('oldest');
    await userEvent.selectOptions(screen.getByLabelText('Row height'), 'compact');
    expect(onChange.mock.calls.at(-1)![0].values.rowHeight).toBe('compact');
    await userEvent.click(screen.getByRole('switch', { name: /Wrap long answers/ }));
    expect(onChange.mock.calls.at(-1)![0].values.wrap).toBe(true);
  });

  it('names the question that names the respondent', async () => {
    const onChange = setup(draft());
    const select = screen.getByLabelText('Respondent name comes from') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.text)).toEqual(['Found in the answers', 'Full name', 'Title of the film', 'Genre']);
    await userEvent.selectOptions(select, 'n');
    expect(onChange.mock.calls.at(-1)![0].values.respondentFrom).toBe('n');
  });

  it('a form on the workspace stages starts new responses in the workspace default and says so', () => {
    setup(draft());
    expect(screen.queryByLabelText('New responses start in')).not.toBeInTheDocument();
    expect(screen.getByText(/the workspace's default stage/)).toBeInTheDocument();
  });

  it('a form with its own stages picks which one new responses start in', async () => {
    const d = draft({}, {
      stagesMode: 'own',
      stages: [
        { id: 'a', name: 'Received', colour: 'neutral', category: 'new' },
        { id: 'b', name: 'Screening', colour: 'warning', category: 'in_progress' },
      ],
    });
    const onChange = setup(d);
    const select = screen.getByLabelText('New responses start in');
    expect(Array.from((select as HTMLSelectElement).options).map((o) => o.text)).toEqual(['Received', 'Screening']);
    await userEvent.selectOptions(select, '1');
    expect(onChange.mock.calls.at(-1)![0].startIndex).toBe(1);
  });
});

describe('sampleResponses', () => {
  it('makes four examples whose answers fit the form\'s questions', () => {
    const made = sampleResponses('f1', FIELDS, { id: 's', name: 'New', colour: 'neutral', category: 'new' });
    expect(made).toHaveLength(4);
    expect(made[0].answers['Full name']).toBe('Asha Rao');
    expect(made[0].answers).not.toHaveProperty('Signature');
    expect(made[0].stage?.name).toBe('New');
  });
});
