/**
 * The chart builder wizard: step by step, with the services faked. Fixtures follow the real shapes (a form from GET /api/forms/:id, an
 * answer from POST /api/forms/:id/charts/query) with names changed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { QueryResult } from '@/types/chartBuilder';

const push = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
const getFormById = vi.hoisted(() => vi.fn());
const query = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const scope = vi.hoisted(() => ({ value: 'personal' as string | undefined }));
const role = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => '/forms/f1/insights/charts/new',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useFormScope', () => ({ useFormScope: () => scope.value }));
vi.mock('@/hooks/useWorkspaceRole', () => ({ useWorkspaceRole: () => role.value }));
vi.mock('@/hooks/useStages', () => ({ useStages: () => ({ data: [{ id: 'st1', name: 'New' }, { id: 'st2', name: 'Review' }] }) }));
vi.mock('@/hooks/useMembers', () => ({ useMembers: () => ({ data: [{ userId: 'u1', name: 'Asha Rao' }] }) }));
vi.mock('@/hooks/useTags', () => ({ useTags: () => ({ data: [{ id: 't1', name: 'VIP' }] }) }));
vi.mock('@/services/forms', () => ({ formsService: { getFormById } }));
vi.mock('@/services/chartBuilder', () => ({ chartBuilderService: { query, create } }));

import { ChartWizard } from '@/components/analytics/builder/ChartWizard';

const FORM = {
  _id: 'f1',
  title: 'Customer service',
  fields: [
    { fieldId: 'name', type: 'short_text', label: 'Name', order: 0, deleted: false },
    { fieldId: 'plan', type: 'dropdown', label: 'Plan', order: 1, deleted: false, options: ['Free', 'Pro', 'Team'] },
    { fieldId: 'age', type: 'number', label: 'Age', order: 2, deleted: false },
    { fieldId: 'when', type: 'date', label: 'Start date', order: 3, deleted: false },
  ],
};

const RESULT: QueryResult = {
  level: { field: { kind: 'question', fieldId: 'plan' }, label: 'Plan', kind: 'choice' },
  fieldType: 'dropdown',
  optionCount: 3,
  measure: { type: 'count', label: 'Responses' },
  total: 42,
  answered: 40,
  blank: 2,
  blankLabel: "didn't answer",
  measureAnswered: null,
  entries: [
    { key: 'Pro', label: 'Pro', value: 20, n: 20, share: 0.5, focus: { key: 'Pro' } },
    { key: 'Free', label: 'Free', value: 12, n: 12, share: 0.3, focus: { key: 'Free' } },
    { key: 'Team', label: 'Team', value: 8, n: 8, share: 0.2, focus: { key: 'Team' } },
  ],
  shown: 3,
  totalGroups: 3,
  warnings: [],
  computedAt: '2026-10-26T10:00:00.000Z',
};

function draw() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ChartWizard formId="f1" />
    </QueryClientProvider>,
  );
}
const user = () => userEvent.setup();

beforeEach(() => {
  push.mockReset();
  toast.mockReset();
  getFormById.mockReset().mockResolvedValue(FORM);
  query.mockReset().mockResolvedValue(RESULT);
  create.mockReset().mockResolvedValue({ _id: 'c1' });
  scope.value = 'personal';
  role.value = undefined;
});

const toStep2 = async (u = user()) => {
  draw();
  await screen.findByRole('radio', { name: /Simple chart/ });
  await u.click(screen.getAllByRole('button', { name: 'Continue' })[0]);
  await screen.findByLabelText('Chart title');
  return u;
};

describe('step 1: the kind of chart', () => {
  it('offers Simple chart, and Drill-down chart marked "Coming soon" that cannot be chosen', async () => {
    draw();
    expect(await screen.findByRole('heading', { name: 'What kind of chart?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create chart' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Simple chart/ })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /Drill-down chart/ })).toBeDisabled();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    const [simple, drill] = screen.getAllByRole('button', { name: 'Continue' });
    expect(simple).toBeEnabled();
    expect(drill).toBeDisabled();
  });

  it('Continue on Simple chart goes to step 2 and moves focus to its heading', async () => {
    const u = await toStep2();
    expect(screen.getByRole('heading', { name: 'Create simple chart' })).toBeInTheDocument();
    const step = screen.getByRole('heading', { name: 'Basic information' });
    expect(step).toHaveFocus();
    const steps = screen.getByRole('navigation', { name: 'Chart steps' });
    expect(within(steps).getByText('Basic information').closest('li')).toHaveAttribute('aria-current', 'step');
    // the finished step is a button that goes back, and says what was chosen
    await u.click(within(steps).getByRole('button', { name: /Chart type/ }));
    expect(await screen.findByRole('heading', { name: 'What kind of chart?' })).toBeInTheDocument();
  });
});

describe('step 2: basic information', () => {
  it('starts on the first choice question with a generated title, and shows the live chart', async () => {
    await toStep2();
    expect(screen.getByLabelText('Chart title')).toHaveValue('Responses by Plan');
    expect(screen.getByLabelText('Group by field')).toHaveValue('q:plan');
    expect(screen.getByText('Dropdown')).toBeInTheDocument(); // the field's type, in its tag
    expect(screen.getByLabelText('Form')).toBeDisabled();
    await waitFor(() => expect(query).toHaveBeenCalled());
    expect(await screen.findByText(/42 responses/)).toBeInTheDocument();
    expect(screen.getByText("2 didn't answer")).toBeInTheDocument();
    // Automatic: the donut for a choice with three options
    expect(screen.getByLabelText('Chart type')).toHaveValue('auto');
    expect(screen.getByRole('option', { name: 'Automatic: Donut chart' })).toBeInTheDocument();
  });

  it('keeps the title the person typed when the field changes, and regenerates it while they have not', async () => {
    const u = await toStep2();
    await u.selectOptions(screen.getByLabelText('Group by field'), 'q:age');
    expect(screen.getByLabelText('Chart title')).toHaveValue('Responses by Age');
    expect(screen.getByText('Numbers are grouped into ranges automatically.')).toBeInTheDocument();
    await u.clear(screen.getByLabelText('Chart title'));
    await u.type(screen.getByLabelText('Chart title'), 'My own title');
    await u.selectOptions(screen.getByLabelText('Group by field'), 'q:plan');
    expect(screen.getByLabelText('Chart title')).toHaveValue('My own title');
    expect(screen.getByText('12/80')).toBeInTheDocument();
  });

  it('offers a date grouping only for a date, starting on Month', async () => {
    const u = await toStep2();
    expect(screen.queryByLabelText('Date grouping')).not.toBeInTheDocument();
    await u.selectOptions(screen.getByLabelText('Group by field'), 's:submittedAt');
    expect(screen.getByLabelText('Date grouping')).toHaveValue('month');
    await u.selectOptions(screen.getByLabelText('Date grouping'), 'year');
    await waitFor(() => expect(query).toHaveBeenLastCalledWith('f1', expect.objectContaining({ groupBy: { field: { kind: 'system', key: 'submittedAt' }, bucket: 'year' } }), 'personal', expect.anything()));
  });

  it('lists questions, response details and time in groups, and never text questions', async () => {
    await toStep2();
    const select = screen.getByLabelText('Group by field');
    expect(within(select).getAllByRole('group').map((g) => g.getAttribute('label'))).toEqual(['Questions', 'Response details', 'Time']);
    expect(within(select).queryByRole('option', { name: 'Name' })).not.toBeInTheDocument();
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Plan', 'Age', 'Start date', 'Stage', 'Assignee', 'Tags', 'Submitted date']);
  });

  it('says "Add a chart title to continue." when the title is empty, and keeps Next usable', async () => {
    const u = await toStep2();
    await u.clear(screen.getByLabelText('Chart title'));
    // an emptied box falls back to nothing: the title is the person's now
    await u.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Add a chart title to continue.');
    expect(screen.getByRole('heading', { name: 'Basic information' })).toBeInTheDocument();
    await u.type(screen.getByLabelText('Chart title'), 'Plans');
    expect(screen.queryByText('Add a chart title to continue.')).not.toBeInTheDocument();
  });
});

describe('step 3: configure', () => {
  const toStep3 = async () => {
    const u = await toStep2();
    await u.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { name: 'Configure chart' });
    return u;
  };

  it('Aggregation, chart type and sort come with defaults; a number field appears for sum, average, minimum and maximum', async () => {
    const u = await toStep3();
    expect(screen.getByLabelText('Aggregation')).toHaveValue('count');
    expect(screen.queryByLabelText('Number field')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toHaveValue('');
    await u.selectOptions(screen.getByLabelText('Aggregation'), 'avg');
    expect(screen.getByLabelText('Number field')).toHaveValue('age');
    await waitFor(() => expect(query).toHaveBeenLastCalledWith('f1', expect.objectContaining({ measure: { type: 'avg', field: { kind: 'question', fieldId: 'age' } } }), 'personal', expect.anything()));
    // a donut does not show an average
    expect(screen.getByRole('option', { name: /Donut chart \(donuts show parts of a whole\)/ })).toBeDisabled();
  });

  it('the filters: none at first, add one, add a group, switch AND to OR, clear all', async () => {
    const u = await toStep3();
    expect(screen.getByText('No filters. The chart uses all responses.')).toBeInTheDocument();
    await u.click(screen.getAllByRole('button', { name: 'Add filter' })[0]);
    await u.click(screen.getAllByRole('button', { name: 'Add filter' })[0]);
    const chip = screen.getByRole('button', { name: /joined by AND/ });
    await u.click(chip);
    expect(screen.getByRole('button', { name: /joined by OR\. Switch to AND/ })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Add filter group' }));
    expect(screen.getByRole('group', { name: 'Filter group 3' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getByText('No filters. The chart uses all responses.')).toBeInTheDocument();
  });

  it('says "Fill in every filter or remove it." while a filter has no value, and counts it once filled', async () => {
    const u = await toStep3();
    await u.click(screen.getAllByRole('button', { name: 'Add filter' })[0]);
    await u.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Fill in every filter or remove it.');
    await u.selectOptions(screen.getByLabelText('Filter 1: value'), 'Pro');
    await waitFor(() => expect(query).toHaveBeenLastCalledWith('f1', expect.objectContaining({ filters: { op: 'and', items: [{ field: { kind: 'question', fieldId: 'plan' }, op: 'is', value: 'Pro' }] } }), 'personal', expect.anything()));
    await u.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: 'Preview & save' })).toBeInTheDocument();
  });

  it('a number filter takes a number, and the title says what the filters are', async () => {
    const u = await toStep3();
    await u.click(screen.getAllByRole('button', { name: 'Add filter' })[0]);
    await u.selectOptions(screen.getByLabelText('Filter 1: field'), 'q:age');
    expect(screen.getByLabelText('Filter 1: condition')).toHaveValue('gte');
    await u.type(screen.getByLabelText('Filter 1: value'), '25');
    await u.selectOptions(screen.getByLabelText('Filter 1: condition'), 'gt');
    expect(screen.getByText('Responses by Plan (Age > 25)')).toBeInTheDocument();
  });

  it('Back keeps everything that was set', async () => {
    const u = await toStep3();
    await u.selectOptions(screen.getByLabelText('Sort by'), 'label_asc');
    await u.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByLabelText('Chart title')).toHaveValue('Responses by Plan');
    await u.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByLabelText('Sort by')).toHaveValue('label_asc');
  });
});

describe('step 4 and saving', () => {
  it('Next, Next, Save to dashboard gives a good chart with nothing filled in', async () => {
    const u = await toStep2();
    await u.click(screen.getByRole('button', { name: 'Next' }));
    await u.click(await screen.findByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { name: 'Preview & save' });
    expect(screen.getByRole('region', { name: 'Final preview' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Save to dashboard' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const [formId, payload, savedScope] = create.mock.calls[0];
    expect(formId).toBe('f1');
    expect(savedScope).toBe('personal');
    expect(payload).toMatchObject({
      title: 'Responses by Plan',
      chartType: 'auto',
      size: 'medium',
      visibility: 'private',
      definition: { kind: 'simple', measure: { type: 'count' }, groupBy: { field: { kind: 'question', fieldId: 'plan' } }, display: { values: 'counts', legend: true, palette: 'theme' } },
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/forms/f1/insights'));
    expect(toast).toHaveBeenCalledWith('Chart added to the dashboard.', 'success');
  });

  it('size, display and palette choices are saved; percentages need a count or a sum', async () => {
    const u = await toStep2();
    await u.click(screen.getByRole('button', { name: 'Next' }));
    await u.click(await screen.findByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { name: 'Preview & save' });
    await u.click(screen.getByRole('button', { name: 'Percentages' }));
    await u.click(screen.getByRole('radio', { name: /Large/ }));
    await u.click(screen.getByRole('radio', { name: /Ocean/ }));
    await u.click(screen.getByRole('switch', { name: 'Show legend' }));
    await u.click(screen.getByRole('button', { name: 'Save to dashboard' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][1]).toMatchObject({ size: 'large', definition: { display: { values: 'percent', palette: 'ocean', legend: false } } });
  });

  it('shows "Share with workspace" only to people who may edit the form in a workspace, and saves it as shared', async () => {
    scope.value = 'acme';
    role.value = 'editor';
    const u = await toStep2();
    await u.click(screen.getByRole('button', { name: 'Next' }));
    await u.click(await screen.findByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { name: 'Preview & save' });
    expect(screen.getByText('Only you can see this chart.')).toBeInTheDocument();
    await u.click(screen.getByRole('switch', { name: 'Share with workspace' }));
    await u.click(screen.getByRole('button', { name: 'Save to dashboard' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][1].visibility).toBe('workspace');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/forms/f1/insights?ws=acme'));
  });

  it('no sharing switch for a personal form', async () => {
    const u = await toStep2();
    await u.click(screen.getByRole('button', { name: 'Next' }));
    await u.click(await screen.findByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { name: 'Preview & save' });
    expect(screen.queryByRole('switch', { name: 'Share with workspace' })).not.toBeInTheDocument();
  });

  it('a save that fails says so and stays on the page', async () => {
    create.mockRejectedValueOnce(new Error('boom'));
    const u = await toStep2();
    await u.click(screen.getByRole('button', { name: 'Next' }));
    await u.click(await screen.findByRole('button', { name: 'Next' }));
    await u.click(await screen.findByRole('button', { name: 'Save to dashboard' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(push).not.toHaveBeenCalled();
  });
});

describe('leaving, and the keyboard', () => {
  it('leaves at once when nothing was changed, and asks "Discard this chart?" when something was', async () => {
    const u = await toStep2();
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(push).toHaveBeenCalledWith('/forms/f1/insights'); // only defaults so far
    push.mockClear();

    await u.type(screen.getByLabelText('Chart title'), ' extra');
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Discard this chart?' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    await u.click(screen.getByRole('button', { name: 'Discard' }));
    expect(push).toHaveBeenCalledWith('/forms/f1/insights');
  });

  it('the back arrow goes one step back, and on the first step leaves the builder', async () => {
    const u = await toStep2();
    await u.click(screen.getByRole('button', { name: 'Back to the previous step' }));
    expect(await screen.findByRole('heading', { name: 'What kind of chart?' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Leave the chart builder' }));
    expect(push).toHaveBeenCalledWith('/forms/f1/insights');
  });

  it('a whole chart can be made with the keyboard alone', async () => {
    const u = user();
    draw();
    const simple = (await screen.findAllByRole('button', { name: 'Continue' }))[0];
    simple.focus();
    await u.keyboard('{Enter}');
    await screen.findByLabelText('Chart title');
    const press = async (name: string) => {
      const button = screen.getByRole('button', { name });
      button.focus();
      await u.keyboard('{Enter}');
    };
    await press('Next');
    await screen.findByRole('heading', { name: 'Configure chart' });
    await press('Next');
    await screen.findByRole('heading', { name: 'Preview & save' });
    await press('Save to dashboard');
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  });
});
