/**
 * The drill-down chart on its own (the same component draws the wizard's preview and the dashboard card): a click opens the next level,
 * the path above it goes back, the last level hands over to "see the responses", and a chart that is not interactive cannot be clicked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DrillQuery, QueryEntry, QueryResult } from '@/types/chartBuilder';
import type { FormField } from '@/types/form';

const query = vi.hoisted(() => vi.fn());
vi.mock('@/services/chartBuilder', () => ({ chartBuilderService: { query } }));

import { DrillChart } from '@/components/analytics/builder/DrillChart';

const f = (fieldId: string, type: string, label: string, order: number, extra: Record<string, unknown> = {}) => ({ fieldId, type, label, order, deleted: false, required: false, ...extra }) as unknown as FormField;
const FIELDS = [f('plan', 'dropdown', 'Plan', 0, { options: ['Free', 'Pro'] }), f('yn', 'yes_no', 'Subscribed', 1), f('rate', 'rating', 'Rating', 2)];

const DEFINITION: DrillQuery = {
  kind: 'drilldown',
  measure: { type: 'count' },
  levels: [{ field: { kind: 'question', fieldId: 'plan' } }, { field: { kind: 'question', fieldId: 'yn' }, chartType: 'hbar' }, { field: { kind: 'question', fieldId: 'rate' } }],
  display: { values: 'counts', legend: true, dataLabels: false, palette: 'theme', interactive: true },
};

const entry = (key: string, n: number): QueryEntry => ({ key, label: key, value: n, n, share: 0.5, focus: { key } });
const level = (depth: number, label: string, entries: QueryEntry[], next: string | null): QueryResult => ({
  level: { field: { kind: 'question', fieldId: 'x' }, label, kind: 'choice' },
  fieldType: 'dropdown',
  optionCount: 2,
  measure: { type: 'count', label: 'Responses' },
  total: entries.reduce((s, e) => s + e.n, 0),
  answered: 10,
  blank: 0,
  blankLabel: "didn't answer",
  measureAnswered: null,
  entries,
  shown: entries.length,
  totalGroups: entries.length,
  depth,
  levelCount: 3,
  nextLevel: next ? { field: { kind: 'question', fieldId: 'y' }, label: next } : null,
  warnings: [],
  computedAt: '2026-10-27T10:00:00.000Z',
});
const ANSWERS = [
  level(0, 'Plan', [entry('Pro', 20), entry('Free', 12)], 'Subscribed'),
  level(1, 'Subscribed', [entry('Yes', 15), entry('No', 5)], 'Rating'),
  level(2, 'Rating', [entry('5', 9), entry('4', 6)], null),
];

const seeResponses = vi.fn();
function draw(definition: DrillQuery = DEFINITION, showPath = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (d: DrillQuery) => (
    <QueryClientProvider client={client}>
      <DrillChart formId="f1" scope="personal" fields={FIELDS} definition={d} label="Plan to rating" onSeeResponses={seeResponses} showPath={showPath} />
    </QueryClientProvider>
  );
  const view = render(tree(definition));
  return { ...view, rerenderWith: (d: DrillQuery) => view.rerender(tree(d)) };
}
/** The charts are drawn as SVG; the table is the same numbers as buttons, and what a keyboard or screen reader uses. */
const clickPart = async (u: ReturnType<typeof userEvent.setup>, label: string) => {
  const toggle = await screen.findByRole('button', { name: 'Show as a table' });
  if (toggle.getAttribute('aria-expanded') !== 'true') await u.click(toggle);
  await u.click(await screen.findByRole('button', { name: `See responses: ${label}` }));
};

beforeEach(() => {
  seeResponses.mockReset();
  query.mockReset().mockImplementation(async (_f, _d, _s, _sig, path: unknown[] = []) => ANSWERS[path.length]);
});

describe('drilling', () => {
  it('opens on level 1 and says where it is and what a click does', async () => {
    draw();
    expect(await screen.findByText(/Level 1 of 3: by Plan\. Click a part to see it by Subscribed\./)).toBeInTheDocument();
    const path = screen.getByRole('navigation', { name: 'Drill-down path' });
    expect(within(path).getByText('All responses')).toHaveAttribute('aria-current', 'step');
    expect(query).toHaveBeenCalledWith('f1', expect.objectContaining({ kind: 'drilldown' }), 'personal', expect.anything(), []);
  });

  it('a click asks for that part at the next level, and the path grows', async () => {
    const u = userEvent.setup();
    draw();
    await screen.findByText(/Level 1 of 3/);
    await clickPart(u, 'Pro');
    await waitFor(() => expect(query).toHaveBeenLastCalledWith('f1', expect.anything(), 'personal', expect.anything(), [{ level: 0, key: 'Pro' }]));
    expect(await screen.findByText(/Level 2 of 3: by Subscribed/)).toBeInTheDocument();
    const path = screen.getByRole('navigation', { name: 'Drill-down path' });
    expect(within(path).getByRole('button', { name: 'All responses' })).toBeInTheDocument();
    expect(within(path).getByText('Pro')).toHaveAttribute('aria-current', 'step');
    expect(seeResponses).not.toHaveBeenCalled();
  });

  it('after a click the chart on screen stays what it was (same level, same type) until the next level arrives', async () => {
    const u = userEvent.setup();
    let release: ((r: QueryResult) => void) | undefined;
    query.mockReset().mockImplementation((_f, _d, _s, _sig, path: unknown[] = []) =>
      path.length === 0 ? Promise.resolve(ANSWERS[0]) : new Promise<QueryResult>((r) => { release = r; }),
    );
    draw();
    await clickPart(u, 'Pro');
    await waitFor(() => expect(release).toBeDefined());
    // the path already says "Pro", but the numbers on screen are still level 1's, and so is the heading over them
    expect(within(screen.getByRole('navigation', { name: 'Drill-down path' })).getByText('Pro')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(/Level 1 of 3: by Plan/)).toBeInTheDocument();
    expect(screen.queryByText(/Level 2 of 3/)).not.toBeInTheDocument();
    release!(ANSWERS[1]);
    expect(await screen.findByText(/Level 2 of 3: by Subscribed/)).toBeInTheDocument();
  });

  it('the path goes back to any earlier level', async () => {
    const u = userEvent.setup();
    draw();
    await clickPart(u, 'Pro');
    await screen.findByText(/Level 2 of 3/);
    await clickPart(u, 'Yes');
    await screen.findByText(/Level 3 of 3: by Rating/);
    const path = screen.getByRole('navigation', { name: 'Drill-down path' });
    await u.click(within(path).getByRole('button', { name: 'Pro' }));
    expect(await screen.findByText(/Level 2 of 3: by Subscribed/)).toBeInTheDocument();
    await u.click(within(screen.getByRole('navigation', { name: 'Drill-down path' })).getByRole('button', { name: 'All responses' }));
    expect(await screen.findByText(/Level 1 of 3: by Plan/)).toBeInTheDocument();
  });

  it('a click on the last level opens its responses, with every part clicked on the way', async () => {
    const u = userEvent.setup();
    draw();
    await clickPart(u, 'Free');
    await screen.findByText(/Level 2 of 3/);
    await clickPart(u, 'No');
    await screen.findByText(/Level 3 of 3: by Rating\. Click a part to see its responses\./);
    await clickPart(u, '5');
    expect(seeResponses).toHaveBeenCalledTimes(1);
    const [steps, picked] = seeResponses.mock.calls[0];
    expect(steps.map((s: { level: number; entry: QueryEntry }) => [s.level, s.entry.key])).toEqual([[0, 'Free'], [1, 'No']]);
    expect(picked.key).toBe('5');
  });

  it('"See these N responses" opens every response at a level that is not the first', async () => {
    const u = userEvent.setup();
    draw();
    expect(screen.queryByRole('button', { name: /See these/ })).not.toBeInTheDocument();
    await clickPart(u, 'Pro');
    await u.click(await screen.findByRole('button', { name: 'See these 20 responses' }));
    const [steps, picked] = seeResponses.mock.calls[0];
    expect(steps).toHaveLength(1);
    expect(picked).toBeNull();
  });

  it('forgets the path when the levels change', async () => {
    const u = userEvent.setup();
    const { rerenderWith } = draw();
    await clickPart(u, 'Pro');
    await screen.findByText(/Level 2 of 3/);
    rerenderWith({ ...DEFINITION, levels: [DEFINITION.levels[1], DEFINITION.levels[0], DEFINITION.levels[2]] });
    expect(await screen.findByText(/Level 1 of 3/)).toBeInTheDocument();
  });

  it('changing only how a level is drawn keeps the path', async () => {
    const u = userEvent.setup();
    const { rerenderWith } = draw();
    await clickPart(u, 'Pro');
    await screen.findByText(/Level 2 of 3/);
    rerenderWith({ ...DEFINITION, levels: [DEFINITION.levels[0], { ...DEFINITION.levels[1], chartType: 'bar' }, DEFINITION.levels[2]] });
    expect(screen.getByText(/Level 2 of 3/)).toBeInTheDocument();
  });
});

describe('when it is not interactive, and the states around it', () => {
  it('shows level 1 only: no path, no clicking', async () => {
    draw({ ...DEFINITION, display: { ...DEFINITION.display!, interactive: false } });
    await screen.findByText(/Level 1 of 3: by Plan/);
    expect(screen.queryByRole('navigation', { name: 'Drill-down path' })).not.toBeInTheDocument();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Show as a table' }));
    expect(screen.queryByRole('button', { name: /See responses/ })).not.toBeInTheDocument();
  });

  it('lists the levels with the one on screen marked, when asked to', async () => {
    const u = userEvent.setup();
    draw(DEFINITION, true);
    const list = await screen.findByRole('region', { name: 'Drill-down path levels' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual(['1Plan' + 'Automatic', '2Subscribed' + 'Bar chart', '3Rating' + 'Automatic']);
    expect(items[0]).toHaveAttribute('aria-current', 'step');
    await clickPart(u, 'Pro');
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Drill-down path levels' })).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step'));
  });

  it('says so when it cannot load, and tries again', async () => {
    query.mockReset().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(ANSWERS[0]);
    const u = userEvent.setup();
    draw();
    expect(await screen.findByText("Couldn't load this chart.")).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/Level 1 of 3: by Plan/)).toBeInTheDocument();
  });
});
