/**
 * The date range on a form's Summary page: it opens on All time, remembers what the person chose (so leaving the page and coming
 * back finds it the same), restores it into the URL, and shares the form header's row for its own controls.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let search = '';
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/forms/form-1/insights',
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock('@/services/forms', () => ({ formsService: { getFormById: () => Promise.resolve({ _id: 'form-1', title: 'Survey', fields: [] }) } }));
const mockGetOverview = vi.fn();
vi.mock('@/services/analytics', () => ({
  analyticsService: {
    getOverview: (...a: unknown[]) => mockGetOverview(...a),
    getTrends: () => Promise.resolve({ bucket: 'day', points: [] }),
    getQuestions: () => Promise.resolve({ questions: [] }),
    getFormsSummary: () => Promise.resolve({ forms: [], total: 0, page: 1, limit: 100 }),
  },
}));
vi.mock('@/services/charts', () => ({ chartsService: { list: () => Promise.resolve([]) } }));
vi.mock('@/components/charts/EChartContainer', () => ({ EChartContainer: () => <div /> }));
vi.mock('@/hooks/useFormScope', () => ({ useFormScope: () => 'personal' }));
vi.mock('@/hooks/useWorkspaceRole', () => ({ useWorkspaceRole: () => 'owner' }));

import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { ToastProvider } from '@/components/ui/Toast';
import { FORM_HEADER_SLOT_ID } from '@/lib/formHeaderSlot';
import { storedRangeKey } from '@/lib/storedDateRange';

const overview = { totalResponses: 10, statusCounts: { new: 4, in_progress: 3, completed: 3 } };
const KEY = storedRangeKey('form-1');

const draw = (formId: string | null = 'form-1') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AnalyticsView formId={formId ?? undefined} />
      </ToastProvider>
    </QueryClientProvider>
  );
};
const remember = (value: unknown, key = KEY) => window.localStorage.setItem(key, JSON.stringify(value));
const remembered = (key = KEY) => JSON.parse(window.localStorage.getItem(key) ?? 'null');
const trigger = () => screen.getByRole('button', { name: /^Filters/ });
const firstOverviewArgs = () => mockGetOverview.mock.calls[0][0] as { from?: string; to?: string };

beforeEach(() => {
  search = '';
  window.localStorage.clear();
  mockReplace.mockReset();
  mockGetOverview.mockReset().mockResolvedValue(overview);
});
afterEach(() => document.getElementById(FORM_HEADER_SLOT_ID)?.remove());

describe('opening the page', () => {
  it('shows All time when nothing was chosen, and asks the server for everything', async () => {
    draw();
    await waitFor(() => expect(mockGetOverview).toHaveBeenCalled());
    expect(trigger()).toHaveTextContent('All time');
    expect(firstOverviewArgs().from).toBeUndefined();
    expect(firstOverviewArgs().to).toBeUndefined();
    expect(mockReplace).not.toHaveBeenCalled(); // nothing to restore
  });

  it('All time has no previous period to compare with, so only one overview is asked for', async () => {
    draw();
    await waitFor(() => expect(mockGetOverview).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(mockGetOverview).toHaveBeenCalledTimes(1);
  });

  it('has All time pressed in the filter', async () => {
    const user = userEvent.setup();
    draw();
    await user.click(trigger());
    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('remembering the choice', () => {
  it('choosing Last 30 days puts it in the URL and remembers it', async () => {
    const user = userEvent.setup();
    draw();
    await user.click(trigger());
    await user.click(screen.getByRole('button', { name: 'Last 30 days' }));

    const href = mockReplace.mock.calls.at(-1)![0] as string;
    const params = new URL(href, 'http://x').searchParams;
    expect(params.get('from')).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(params.get('to')).toMatch(/^\d{4}-\d\d-\d\dT/);
    // remembered as the preset (so it stays "the last 30 days"), not as dates
    expect(remembered()).toMatchObject({ preset: '30d' });
    expect(remembered().from).toBeUndefined();
  });

  it('coming back to a bare URL shows the remembered range, fetches with it, and puts it in the URL', async () => {
    remember({ preset: '30d' });
    draw();
    expect(trigger()).toHaveTextContent('Last 30 days');
    await waitFor(() => expect(mockGetOverview).toHaveBeenCalled());
    expect(firstOverviewArgs().from).toBeDefined(); // the very first request already uses it: nothing fetched twice for All time
    expect(firstOverviewArgs().to).toBeDefined();
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    const params = new URL(mockReplace.mock.calls[0][0] as string, 'http://x').searchParams;
    expect(params.get('from')).toBe(firstOverviewArgs().from);
    expect(params.get('to')).toBe(firstOverviewArgs().to);
  });

  it('a 30-day range has a previous period, so the comparison is asked for', async () => {
    remember({ preset: '30d' });
    draw();
    await waitFor(() => expect(mockGetOverview).toHaveBeenCalledTimes(2));
  });

  it.each([['7d', 'Last 7 days'], ['90d', 'Last 90 days']])('remembers %s', (preset, label) => {
    remember({ preset });
    draw();
    expect(trigger()).toHaveTextContent(label);
  });

  it('an explicit All time in the URL beats what was remembered', async () => {
    remember({ preset: '30d' });
    search = 'from=all&to=all';
    draw();
    expect(trigger()).toHaveTextContent('All time');
    await waitFor(() => expect(mockGetOverview).toHaveBeenCalled());
    expect(firstOverviewArgs().from).toBeUndefined();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('a range in the URL (a shared link) beats what was remembered, and becomes the remembered one', async () => {
    remember({ preset: '7d' });
    search = 'from=2026-09-01T00%3A00%3A00.000Z&to=2026-09-15T23%3A59%3A59.999Z';
    draw();
    expect(trigger()).toHaveTextContent('Custom range');
    await waitFor(() => expect(remembered()).toMatchObject({ preset: 'custom', from: '2026-09-01T00:00:00.000Z', to: '2026-09-15T23:59:59.999Z' }));
  });

  it('restores a remembered custom range with its dates', async () => {
    remember({ preset: 'custom', from: '2026-09-01T00:00:00.000Z', to: '2026-09-15T23:59:59.999Z' });
    draw();
    expect(trigger()).toHaveTextContent('Custom range');
    await waitFor(() => expect(mockGetOverview).toHaveBeenCalled());
    expect(firstOverviewArgs()).toMatchObject({ from: '2026-09-01T00:00:00.000Z', to: '2026-09-15T23:59:59.999Z' });
  });

  it('ignores a damaged remembered value and shows All time', () => {
    window.localStorage.setItem(KEY, '{"preset":"yesterday"');
    draw();
    expect(trigger()).toHaveTextContent('All time');
  });

  it('is remembered per form: another form is not affected', () => {
    remember({ preset: '30d' }, storedRangeKey('some-other-form'));
    draw();
    expect(trigger()).toHaveTextContent('All time');
  });

  it('choosing All time after a narrower one is remembered too (it is not "nothing chosen")', async () => {
    remember({ preset: '30d' });
    const user = userEvent.setup();
    draw();
    await user.click(trigger());
    await user.click(screen.getByRole('button', { name: 'All time' }));
    expect(remembered()).toMatchObject({ preset: 'all' });
    const params = new URL(mockReplace.mock.calls.at(-1)![0] as string, 'http://x').searchParams;
    expect(params.get('from')).toBe('all');
    expect(params.get('to')).toBe('all');
  });
});

describe('compare to previous period', () => {
  it('is on until switched off, and the choice is remembered', async () => {
    remember({ preset: '30d' });
    const user = userEvent.setup();
    draw();
    await user.click(trigger());
    const box = screen.getByRole('checkbox', { name: 'Compare to previous period' });
    expect(box).toBeChecked();
    await user.click(box);
    expect(remembered()).toMatchObject({ preset: '30d', compare: false });
    expect(screen.getByRole('checkbox', { name: 'Compare to previous period' })).not.toBeChecked();
  });

  it('comes back switched off, and then asks for no previous period', async () => {
    remember({ preset: '30d', compare: false });
    draw();
    await waitFor(() => expect(mockGetOverview).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(mockGetOverview).toHaveBeenCalledTimes(1);
  });

  it('is unavailable for All time', async () => {
    const user = userEvent.setup();
    draw();
    await user.click(trigger());
    expect(screen.getByRole('checkbox', { name: 'Compare to previous period' })).toBeDisabled();
  });
});

describe('the workspace-wide Insights page', () => {
  it('remembers its own range, separately from any form', async () => {
    remember({ preset: '90d' }, storedRangeKey(undefined, 'personal'));
    draw(null);
    expect(trigger()).toHaveTextContent('Last 90 days');
  });
});

describe('where the controls sit', () => {
  it('in the form header\'s own row when it is there: Filters and Add chart next to Summary / Responses and Edit form', async () => {
    const slot = document.createElement('div');
    slot.id = FORM_HEADER_SLOT_ID;
    document.body.appendChild(slot);
    const { container } = draw();
    await waitFor(() => expect(within(slot).getByRole('button', { name: /^Filters/ })).toBeInTheDocument());
    expect(within(slot).getByRole('button', { name: 'Add chart' })).toBeInTheDocument();
    // and not a second row inside the page
    expect(within(container).queryByRole('button', { name: /^Filters/ })).not.toBeInTheDocument();
    expect(within(container).queryByRole('button', { name: 'Add chart' })).not.toBeInTheDocument();
  });

  it('Add chart is the same size as the other header buttons, not a small one', async () => {
    const slot = document.createElement('div');
    slot.id = FORM_HEADER_SLOT_ID;
    document.body.appendChild(slot);
    draw();
    const add = await within(slot).findByRole('button', { name: 'Add chart' });
    expect(add).not.toHaveClass('bg-btn-sm');
    expect(trigger()).toHaveClass('bg-btn'); // Filters is a regular-size button too
    expect(trigger()).not.toHaveClass('min-h-10');
  });

  it('without the header (the page on its own) they still appear, in a row of their own', async () => {
    const { container } = draw();
    expect(await within(container).findByRole('button', { name: /^Filters/ })).toBeInTheDocument();
    expect(within(container).getByRole('button', { name: 'Add chart' })).toBeInTheDocument();
  });

  it('opens a compact panel: small preset chips, not button-sized pills', async () => {
    const user = userEvent.setup();
    draw();
    await user.click(trigger());
    const dialog = screen.getByRole('dialog', { name: 'Analytics filters' });
    for (const chip of within(dialog).getAllByRole('button', { pressed: undefined }).filter((b) => b.hasAttribute('aria-pressed'))) {
      expect(chip).toHaveClass('h-8');
    }
    expect(dialog.className).toMatch(/380px/);
  });
});
