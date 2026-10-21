import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubmittedResponse } from '@/components/responses/SubmittedResponse';
import type { ResponseViewConfig } from '@/types/responseView';
import { SUBMITTED_ANSWERS, TOTAL_QUESTIONS, UNANSWERED, submittedItems } from '../../fixtures/submittedResponse';

let narrow = false;
vi.mock('@/hooks/useNarrow', () => ({ useNarrow: () => narrow }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/responses/answers/FileAnswer', () => ({ FileAnswer: () => <div /> }));
vi.mock('@/components/responses/answers/ImageAnswer', () => ({ ImageAnswer: () => <div /> }));
vi.mock('@/components/responses/answers/UrlAnswer', () => ({
  UrlAnswer: ({ value, chip }: { value: string; chip?: boolean }) => <a href={value}>{chip ? 'chip:' : 'card:'}{value}</a>,
}));

const svc = vi.hoisted(() => ({ get: vi.fn(), savePersonal: vi.fn(), clearPersonal: vi.fn(), saveFormDefault: vi.fn() }));
vi.mock('@/services/responseView', () => ({ responseViewService: svc }));

const SYSTEM: ResponseViewConfig = {
  resolved: { layout: 'grid', density: 'comfortable', showEmpty: true, showNumbers: true, source: 'system' },
  formDefault: null,
  personal: null,
  personalAll: null,
};

const items = submittedItems();
let qc: QueryClient;

function draw(props: Partial<React.ComponentProps<typeof SubmittedResponse>> = {}) {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SubmittedResponse responseId="r1" items={items} formId="f1" scope="acme" hasSchema {...props} />
    </QueryClientProvider>
  );
}
const card = () => screen.getByRole('region', { name: 'Submitted response' });
const layoutOf = () => card().getAttribute('data-layout');

beforeEach(() => {
  narrow = false;
  window.localStorage.clear();
  svc.get.mockReset().mockResolvedValue(SYSTEM);
  svc.savePersonal.mockReset().mockResolvedValue(null);
  svc.clearPersonal.mockReset().mockResolvedValue(undefined);
  svc.saveFormDefault.mockReset();
});

describe('header', () => {
  it('says how many questions were answered', () => {
    draw();
    expect(screen.getByText(`${TOTAL_QUESTIONS - UNANSWERED} of ${TOTAL_QUESTIONS} answered`)).toBeInTheDocument();
  });

  it('starts as a Grid for someone who has not chosen', () => {
    draw();
    expect(layoutOf()).toBe('grid');
    expect(screen.getByRole('radio', { name: 'Grid' })).toHaveAttribute('aria-checked', 'true');
  });
});

describe('switching layouts', () => {
  it('is instant, keeps every answer, and never refetches anything but its own save', async () => {
    draw();
    await waitFor(() => expect(svc.get).toHaveBeenCalledTimes(1));
    const everyAnswer = () => {
      for (const needle of ['Night Train', 'Blue Door Films', 'asha.rao@example.com', 'Pune', 'Line 12 of the synopsis']) {
        expect(card().textContent).toContain(needle);
      }
    };

    await userEvent.click(screen.getByRole('radio', { name: 'List' }));
    expect(layoutOf()).toBe('list'); // synchronously after the click: no spinner, no waiting
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    everyAnswer();

    await userEvent.click(screen.getByRole('radio', { name: 'Table' }));
    expect(layoutOf()).toBe('table');
    expect(within(card()).getAllByRole('row')).toHaveLength(TOTAL_QUESTIONS);
    everyAnswer();
    expect(card().textContent).toContain('chip:'); // links become chips in the Table...
    expect(card().textContent).not.toContain('card:'); // ...and only there

    await userEvent.click(screen.getByRole('radio', { name: 'Grid' }));
    expect(layoutOf()).toBe('grid');
    everyAnswer();
    expect(svc.get).toHaveBeenCalledTimes(1);
  });

  it('announces the new layout', async () => {
    draw();
    await userEvent.click(screen.getByRole('radio', { name: 'Table' }));
    expect(screen.getAllByRole('status').some((s) => s.textContent === 'Layout: Table')).toBe(true);
  });

  it('saves the choice in the background under this form', async () => {
    draw();
    await userEvent.click(screen.getByRole('radio', { name: 'Table' }));
    await waitFor(() => expect(svc.savePersonal).toHaveBeenCalledWith('f1', expect.objectContaining({ layout: 'table' }), 'acme'), { timeout: 2000 });
  });

  it('works with the arrow keys', async () => {
    draw();
    screen.getByRole('radio', { name: 'Grid' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(layoutOf()).toBe('list');
  });

  it('shows the layout the server resolved (a form default, say)', async () => {
    svc.get.mockResolvedValue({ ...SYSTEM, resolved: { ...SYSTEM.resolved, layout: 'table', source: 'formDefault' } });
    draw();
    await waitFor(() => expect(layoutOf()).toBe('table'));
  });

  it('uses the layout remembered on this device before the request returns', () => {
    window.localStorage.setItem('beginso:response-view:f1', JSON.stringify({ layout: 'list', density: 'compact', showEmpty: true, showNumbers: true }));
    svc.get.mockReturnValue(new Promise(() => {}));
    draw();
    expect(layoutOf()).toBe('list');
  });

  it('falls back to Grid with every answer when the view request fails', async () => {
    svc.get.mockRejectedValue(new Error('500'));
    draw();
    await waitFor(() => expect(svc.get).toHaveBeenCalled());
    expect(layoutOf()).toBe('grid');
    expect(card().textContent).toContain('Night Train');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('options', () => {
  const openOptions = async () => userEvent.click(screen.getByRole('button', { name: 'Options' }));

  it('"Show empty answers" off hides the unanswered rows and says how many are hidden', async () => {
    draw();
    expect(within(card()).getAllByText('—').length).toBeGreaterThanOrEqual(UNANSWERED);
    await openOptions();
    await userEvent.click(screen.getByRole('switch', { name: 'Show empty answers' }));

    expect(within(card()).queryByText('—')).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${UNANSWERED} empty hidden`))).toBeInTheDocument();
    // hiding is never silent: the count is on screen, and so is the way back
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.queryByText(/empty hidden/)).not.toBeInTheDocument();
    expect(within(card()).getAllByText('—').length).toBeGreaterThanOrEqual(UNANSWERED);
  });

  it('does not say "hidden" when nothing is hidden', async () => {
    draw();
    expect(screen.queryByText(/empty hidden/)).not.toBeInTheDocument();
  });

  it('"Show question numbers" off removes the numbers', async () => {
    draw();
    expect(card().textContent).toMatch(/1\.\s*Email address/);
    await openOptions();
    await userEvent.click(screen.getByRole('switch', { name: 'Show question numbers' }));
    expect(card().textContent).not.toMatch(/1\.\s*Email address/);
    expect(card().textContent).toContain('Email address');
  });

  it('density tightens the rows', async () => {
    draw();
    const row = () => screen.getByRole('heading', { name: /Content Title/ }).closest('div.group')!;
    expect(row()).toHaveClass('py-2.5');
    await openOptions();
    await userEvent.click(screen.getByRole('radio', { name: 'Compact' }));
    expect(row()).toHaveClass('py-1.25');
  });

  it('closes with Escape and returns focus to the button, without closing anything behind it', async () => {
    const onEscape = vi.fn();
    document.addEventListener('keydown', onEscape);
    draw();
    await openOptions();
    expect(screen.getByRole('group', { name: 'Response view options' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Response view options' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Options' })).toHaveFocus();
    expect(onEscape).not.toHaveBeenCalled();
    document.removeEventListener('keydown', onEscape);
  });

  it('only editors are offered "Set as form default"', async () => {
    draw();
    await openOptions();
    expect(screen.queryByRole('button', { name: 'Set as form default' })).not.toBeInTheDocument();
  });

  it('editors can set the form default', async () => {
    svc.saveFormDefault.mockResolvedValue({ layout: 'grid', density: 'comfortable', showEmpty: true, showNumbers: true, version: 1, pinned: [], fields: [] });
    draw({ canSetFormDefault: true });
    await openOptions();
    await userEvent.click(screen.getByRole('button', { name: 'Set as form default' }));
    expect(svc.saveFormDefault).toHaveBeenCalledWith('f1', expect.objectContaining({ layout: 'grid' }), 0, 'acme');
  });

  it('"Use the form\'s default" appears only when a personal choice exists', async () => {
    draw();
    await openOptions();
    expect(screen.queryByRole('button', { name: "Use the form's default" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Table' })); // makes a personal choice
    await openOptions();
    expect(screen.getByRole('button', { name: "Use the form's default" })).toBeInTheDocument();
  });
});

describe('search', () => {
  it('filters by label or answer and highlights the match', async () => {
    draw();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search in response' }), 'director');
    expect(within(card()).getAllByRole('heading', { level: 4 })).toHaveLength(1);
    expect(card().querySelector('mark')?.textContent).toBe('Director');
  });

  it('says so when nothing matches, and clears with Escape', async () => {
    draw();
    const box = screen.getByRole('searchbox', { name: 'Search in response' });
    await userEvent.type(box, 'zzz-nothing');
    expect(screen.getByText(/No answers match/)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(box).toHaveValue('');
    expect(screen.queryByText(/No answers match/)).not.toBeInTheDocument();
  });

  it('"/" focuses the search, but not while typing elsewhere', async () => {
    draw();
    await userEvent.keyboard('/');
    expect(screen.getByRole('searchbox', { name: 'Search in response' })).toHaveFocus();
  });

  it('a second Escape on an empty box is left for whatever is behind (the drawer)', async () => {
    const onEscape = vi.fn();
    document.addEventListener('keydown', onEscape);
    draw();
    screen.getByRole('searchbox', { name: 'Search in response' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalled();
    document.removeEventListener('keydown', onEscape);
  });
});

describe('edge cases', () => {
  it('no answers at all', () => {
    draw({ items: [] });
    expect(screen.getByText('No submitted answers.')).toBeInTheDocument();
    expect(screen.getByText('All answers provided by the respondent.')).toBeInTheDocument();
  });

  it('one answer', () => {
    draw({ items: items.slice(0, 1) });
    expect(card().textContent).toContain('asha.rao@example.com');
    expect(screen.getByText('1 of 1 answered')).toBeInTheDocument();
  });

  it('answers of a removed question come last under their own heading', () => {
    draw({ items: submittedItems({ ...SUBMITTED_ANSWERS, 'Question we deleted': 'still here' }) });
    const removedHeading = screen.getByRole('heading', { name: 'Other answers (question removed)' });
    const rows = within(card()).getAllByRole('heading', { level: 4 });
    // every real question comes first; the heading is followed only by the removed question's own row
    expect(rows[rows.length - 2]).toBe(removedHeading);
    expect(rows[rows.length - 1]).toHaveTextContent('Question we deleted');
    expect(card().textContent).toContain('still here');
  });

  it('does not call anything "removed" while the form definition is unavailable', () => {
    draw({ hasSchema: false, items: submittedItems({ Loose: 'x' }, []) });
    expect(screen.queryByText(/question removed/)).not.toBeInTheDocument();
    expect(card().textContent).toContain('Loose');
  });

  it('shows a skeleton shaped like the chosen layout while the form loads', () => {
    window.localStorage.setItem('beginso:response-view:f1', JSON.stringify({ layout: 'table', density: 'comfortable', showEmpty: true, showNumbers: true }));
    draw({ loading: true });
    const busy = card().querySelector('[aria-busy="true"]')!;
    expect(busy).toBeInTheDocument();
    expect(busy.querySelector('.grid-cols-\\[35\\%_1fr\\]')).not.toBeNull();
  });

  it('a duplicate question label keeps its own answer', () => {
    const fields = [
      { fieldId: 'a', pageId: 'p1', label: 'Comment', type: 'short_text', order: 0 },
      { fieldId: 'b', pageId: 'p1', label: 'Comment', type: 'short_text', order: 1 },
    ] as never;
    draw({ items: submittedItems({ Comment: 'first', 'Comment (2)': 'second' }, fields) });
    expect(card().textContent).toContain('first');
    expect(card().textContent).toContain('second');
  });
});

describe('small screens', () => {
  it('shows a list whatever was chosen, with a quiet note instead of the switcher', async () => {
    narrow = true;
    svc.get.mockResolvedValue({ ...SYSTEM, resolved: { ...SYSTEM.resolved, layout: 'table', source: 'personal' } });
    draw();
    await waitFor(() => expect(svc.get).toHaveBeenCalled());
    expect(layoutOf()).toBe('list');
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Shown as a list on small screens')).toBeInTheDocument();
    expect(card().textContent).toContain('Night Train');
  });

  it('keeps the saved choice for when the screen is wide again', async () => {
    narrow = true;
    svc.get.mockResolvedValue({ ...SYSTEM, resolved: { ...SYSTEM.resolved, layout: 'table', source: 'personal' } });
    const { rerender } = draw();
    await waitFor(() => expect(svc.get).toHaveBeenCalled());
    narrow = false;
    rerender(
      <QueryClientProvider client={qc}>
        <SubmittedResponse responseId="r1" items={items} formId="f1" scope="acme" hasSchema />
      </QueryClientProvider>
    );
    await waitFor(() => expect(layoutOf()).toBe('table'));
  });
});
