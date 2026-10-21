/**
 * The Responses calendar as a real calendar: always the days of the month (even an empty one), today picked out, Today / previous /
 * next and a month picker, stage-coloured chips, "+N more", and keyboard movement between days. One quiet control bar, no extra rows.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetResponses = vi.fn();
vi.mock('@/services/responses', () => ({ responsesService: { getResponses: (...a: unknown[]) => mockGetResponses(...a) } }));
vi.mock('@/hooks/useFormFields', () => {
  const fields = [{ fieldId: 'Name', type: 'short_text', label: 'Full name', required: false, deleted: false }];
  return { useFormFields: () => fields, useFormFieldsMap: () => ({ f1: fields }) };
});

import { ResponsesCalendar } from '@/components/responses/ResponsesCalendar';
import type { IResponse } from '@/types/response';

const NEW = { id: 's-new', name: 'New', colour: 'info', category: 'new' } as const;
const REVIEW = { id: 's-review', name: 'In Review', colour: 'warning', category: 'in_progress' } as const;

function response(id: string, submittedAt: string, stage: IResponse['stage'] = NEW, name = `Person ${id}`): IResponse {
  return {
    _id: id, formId: 'f1', reference: `#${id}`, answers: { Name: name }, stage, assignee: null, tags: [], noteCount: 0, attachmentCount: 0,
    unread: false, duplicateOfId: null, submittedAt, createdAt: submittedAt, updatedAt: submittedAt,
  };
}
const serve = (data: IResponse[]) => mockGetResponses.mockResolvedValue({ data, total: data.length, page: 1, limit: 50, totalPages: 1 });

const SEPT = new Date(Date.UTC(2026, 8, 1));
let onView: ReturnType<typeof vi.fn>;

function draw(props: Partial<React.ComponentProps<typeof ResponsesCalendar>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  onView = vi.fn();
  return render(
    <QueryClientProvider client={qc}>
      <ResponsesCalendar scope="acme" filters={{}} timezone="UTC" onViewResponse={onView as unknown as (id: string) => void} initialDate={SEPT} {...props} />
    </QueryClientProvider>
  );
}
const cell = (key: string) => screen.getByRole('gridcell', { name: new RegExp(`^${key},`) });
const grid = () => screen.getByRole('grid');

beforeEach(() => {
  mockGetResponses.mockReset();
  serve([]);
});
afterEach(() => vi.useRealTimers());

describe('it is a calendar', () => {
  it('shows weekday headings and every day of full weeks, Sunday first, in one grid', async () => {
    draw();
    await screen.findByText('No responses this month');
    const heads = within(grid()).getAllByRole('columnheader').map((h) => h.textContent?.toLowerCase());
    expect(heads).toHaveLength(7);
    expect(heads[0]).toContain('sun');
    expect(heads[6]).toContain('sat');
    const cells = within(grid()).getAllByRole('gridcell');
    expect(cells).toHaveLength(35); // September 2026 spans five weeks
    expect(within(grid()).getAllByRole('row')).toHaveLength(1 + 5); // heading row + five weeks
  });

  it('keeps the calendar when a month has no responses, and says so quietly under the month, not in a banner of its own', async () => {
    draw();
    const note = await screen.findByText('No responses this month');
    expect(within(grid()).getAllByRole('gridcell')).toHaveLength(35);
    expect(note.closest('[role="status"]')).toBeNull();
    expect(screen.queryByText(/Nothing was submitted in this month/)).not.toBeInTheDocument();
  });

  it('names the month and counts the responses in it', async () => {
    serve([response('a', '2026-09-10T08:00:00.000Z'), response('b', '2026-09-11T08:00:00.000Z')]);
    draw();
    expect(screen.getByRole('heading', { name: /September 2026/ })).toBeInTheDocument();
    expect(await screen.findByText(/^2 responses/)).toBeInTheDocument();
  });

  it('says the timezone once, in the line under the month', async () => {
    draw({ timezone: 'Asia/Kolkata' });
    expect(await screen.findByText('Asia/Kolkata')).toBeInTheDocument();
    expect(screen.queryByText(/Times are shown in/)).not.toBeInTheDocument();
  });

  it('shows days of the neighbouring months, with their own responses, which do not count towards this month', async () => {
    serve([response('edge', '2026-08-31T08:00:00.000Z')]); // the grid starts on Sunday 30 August
    draw();
    await waitFor(() => expect(cell('2026-08-31')).toHaveAccessibleName('2026-08-31, 1 response'));
    expect(screen.getByText('No responses this month')).toBeInTheDocument();
  });

  it('asks for the whole visible grid, not only the month', async () => {
    draw();
    await waitFor(() => expect(mockGetResponses).toHaveBeenCalled());
    const { from, to } = mockGetResponses.mock.calls[0][0] as { from: string; to: string };
    expect(new Date(from).getTime()).toBeLessThanOrEqual(new Date('2026-08-30T00:00:00.000Z').getTime());
    expect(new Date(to).getTime()).toBeGreaterThanOrEqual(new Date('2026-10-04T00:00:00.000Z').getTime());
  });

  it('is one bar of controls above the grid: no filter row, no banner, no footer', async () => {
    serve([response('a', '2026-09-10T08:00:00.000Z')]);
    draw();
    await screen.findByText(/^1 response/);
    expect(screen.queryByRole('group', { name: 'Show stages' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText(/Times are shown in/)).not.toBeInTheDocument();
  });
});

describe('today', () => {
  it("is picked out in the workspace's own timezone", async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T22:00:00.000Z'));
    draw({ initialDate: undefined, timezone: 'Asia/Kolkata' }); // already the 16th in India
    await screen.findByText('No responses this month');
    expect(cell('2026-09-16')).toHaveAttribute('aria-current', 'date');
    expect(cell('2026-09-15')).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('heading', { name: /September 2026/ })).toBeInTheDocument();
  });

  it('the Today button is off on the current month, and takes you back from anywhere', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T10:00:00.000Z'));
    const user = userEvent.setup();
    draw({ initialDate: undefined });
    const today = screen.getByRole('button', { name: 'Today' });
    expect(today).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { name: /October 2026/ })).toBeInTheDocument();
    expect(today).toBeEnabled();
    await user.click(today);
    expect(screen.getByRole('heading', { name: /September 2026/ })).toBeInTheDocument();
    expect(today).toBeDisabled();
  });
});

describe('moving around', () => {
  it('previous and next change the month and ask for its days', async () => {
    const user = userEvent.setup();
    draw();
    await screen.findByText('No responses this month');
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { name: /October 2026/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('heading', { name: /August 2026/ })).toBeInTheDocument();
    expect(mockGetResponses.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('rolls over the year in both directions', async () => {
    const user = userEvent.setup();
    draw({ initialDate: new Date(Date.UTC(2026, 11, 1)) });
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { name: /January 2027/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('heading', { name: /November 2026/ })).toBeInTheDocument();
  });
});

describe('jumping to a month', () => {
  const openPicker = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: /September 2026/ }));
    return screen.getByRole('dialog', { name: 'Choose a month' });
  };

  it('is one control on the month itself, not two dropdowns', () => {
    draw();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: /September 2026/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('heading', { name: /September 2026/ })).toContainElement(trigger);
  });

  it('opens a panel with the year and twelve months, the current one marked', async () => {
    const user = userEvent.setup();
    draw();
    const panel = await openPicker(user);
    expect(within(panel).getByText('2026')).toBeInTheDocument();
    const months = within(panel).getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
    expect(months).toHaveLength(12);
    const current = months.filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(current).toHaveLength(1);
    expect(current[0].textContent?.toLowerCase()).toContain('sep');
  });

  it('picks a month of the same year, and closes', async () => {
    const user = userEvent.setup();
    draw();
    const panel = await openPicker(user);
    await user.click(within(panel).getByRole('button', { name: /^mar/i }));
    expect(screen.getByRole('heading', { name: /March 2026/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Choose a month' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /March 2026/ })).toHaveFocus();
  });

  it('steps the year first, then picks a month of it', async () => {
    const user = userEvent.setup();
    draw();
    const panel = await openPicker(user);
    await user.click(within(panel).getByRole('button', { name: 'Previous year' }));
    await user.click(within(panel).getByRole('button', { name: 'Previous year' }));
    expect(within(panel).getByText('2024')).toBeInTheDocument();
    // the current month is only marked in its own year
    expect(within(panel).getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(0);
    await user.click(within(panel).getByRole('button', { name: 'Next year' }));
    await user.click(within(panel).getByRole('button', { name: /^dec/i }));
    expect(screen.getByRole('heading', { name: /December 2025/ })).toBeInTheDocument();
  });

  it('looks for responses in the month it jumped to', async () => {
    const user = userEvent.setup();
    draw();
    await waitFor(() => expect(mockGetResponses).toHaveBeenCalled());
    mockGetResponses.mockClear();
    const panel = await openPicker(user);
    await user.click(within(panel).getByRole('button', { name: /^jan/i }));
    await waitFor(() => expect(mockGetResponses).toHaveBeenCalled());
    const { from } = mockGetResponses.mock.calls[0][0] as { from: string };
    expect(new Date(from).getTime()).toBeLessThan(new Date('2026-01-01T00:00:00.000Z').getTime());
  });

  it('closes with Escape (returning focus), and when you click away, without changing the month', async () => {
    const user = userEvent.setup();
    draw();
    await openPicker(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Choose a month' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /September 2026/ })).toHaveFocus();
    await openPicker(user);
    await user.click(document.body);
    expect(screen.queryByRole('dialog', { name: 'Choose a month' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /September 2026/ })).toBeInTheDocument();
  });

  it('reopens on the year being shown, not the year last browsed', async () => {
    const user = userEvent.setup();
    draw();
    const panel = await openPicker(user);
    await user.click(within(panel).getByRole('button', { name: 'Next year' }));
    await user.keyboard('{Escape}');
    const again = await openPicker(user);
    expect(within(again).getByText('2026')).toBeInTheDocument();
  });
});

describe('what a day shows', () => {
  it('a chip per response: the respondent, the time and the stage colour', async () => {
    serve([response('a', '2026-09-10T08:30:00.000Z', REVIEW, 'Asha Rao')]);
    draw();
    const chip = await within(cell('2026-09-10')).findByRole('button', { name: /Asha Rao/ });
    expect(chip).toHaveTextContent(/8:30|08:30/);
    expect(chip).toHaveAttribute('title', expect.stringContaining('In Review'));
    expect(chip.className).toContain('--warning-surface');
  });

  it('clicking a chip opens that response, and only that', async () => {
    serve([response('a', '2026-09-10T08:30:00.000Z', NEW, 'Asha Rao'), response('b', '2026-09-10T09:30:00.000Z', NEW, 'Ben Das')]);
    const user = userEvent.setup();
    draw();
    await user.click(await within(cell('2026-09-10')).findByRole('button', { name: /Ben Das/ }));
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onView).toHaveBeenCalledWith('b');
  });

  it('shows three chips, then "+N more", which opens that day\'s list', async () => {
    serve(Array.from({ length: 5 }, (_, i) => response(`r${i}`, `2026-09-10T0${i + 1}:00:00.000Z`, NEW, `Person ${i}`)));
    const user = userEvent.setup();
    draw();
    const c = cell('2026-09-10');
    await within(c).findByText('+2');
    expect(within(c).getAllByRole('button', { name: /Person/ })).toHaveLength(3);
    await user.click(within(c).getByRole('button', { name: /\+2/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Thursday/)).toBeInTheDocument();
    expect(within(dialog).getByText('5 responses')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /Person 4/ }));
    expect(onView).toHaveBeenCalledWith('r4');
  });

  it('a day with one response opens it directly; a day with none does nothing', async () => {
    serve([response('solo', '2026-09-12T08:00:00.000Z')]);
    const user = userEvent.setup();
    draw();
    await within(cell('2026-09-12')).findByRole('button', { name: /Person solo/ });
    await user.click(cell('2026-09-12'));
    expect(onView).toHaveBeenCalledWith('solo');
    onView.mockClear();
    await user.click(cell('2026-09-13'));
    expect(onView).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('puts a late-evening UTC submission on the next day in an Indian workspace, and shows its local time', async () => {
    serve([response('night', '2026-09-15T23:30:00.000Z')]);
    draw({ timezone: 'Asia/Kolkata' });
    const chip = await within(cell('2026-09-16')).findByRole('button', { name: /Person night/ });
    expect(chip).toHaveTextContent(/5:00|05:00/);
  });
});

describe('filters', () => {
  it("has no stage filter of its own: the page's stage chips already filter the calendar, and a chip names its stage on hover", async () => {
    serve([response('a', '2026-09-03T08:00:00.000Z', NEW), response('c', '2026-09-05T08:00:00.000Z', REVIEW)]);
    draw();
    await screen.findByText(/^2 responses/);
    expect(screen.queryByRole('group', { name: 'Show stages' })).not.toBeInTheDocument();
    expect(await within(cell('2026-09-05')).findByRole('button', { name: /Person c/ })).toHaveAttribute('title', expect.stringContaining('In Review'));
  });

  it("passes the page's filters to the request, with its own date window", async () => {
    draw({ filters: { stageId: 's-hold', q: 'asha', from: '2020-01-01T00:00:00.000Z' } as never });
    await waitFor(() => expect(mockGetResponses).toHaveBeenCalled());
    const params = mockGetResponses.mock.calls[0][0] as Record<string, unknown>;
    expect(params).toMatchObject({ stageId: 's-hold', q: 'asha' });
    expect(params.from).not.toBe('2020-01-01T00:00:00.000Z'); // the month on screen decides the window, not a leftover date filter
  });
});

describe('keyboard', () => {
  it('arrow keys move between days, and Page Down / Page Up change month', async () => {
    const user = userEvent.setup();
    draw();
    await screen.findByText('No responses this month');
    cell('2026-08-30').focus();
    await user.keyboard('{ArrowRight}');
    expect(cell('2026-08-31')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(cell('2026-09-07')).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowUp}'); // 7 Sep, one day back is 6 Sep, one week back is 30 Aug
    expect(cell('2026-08-30')).toHaveFocus();
    await user.keyboard('{PageDown}');
    expect(screen.getByRole('heading', { name: /October 2026/ })).toBeInTheDocument();
    expect(cell('2026-10-30')).toHaveFocus(); // the same day of the month, so the next key still works
    await user.keyboard('{PageUp}');
    expect(screen.getByRole('heading', { name: /September 2026/ })).toBeInTheDocument();
    expect(cell('2026-09-30')).toHaveFocus();
  });

  it('Page Down from the 31st lands on the last day of a shorter month', async () => {
    const user = userEvent.setup();
    draw({ initialDate: new Date(Date.UTC(2026, 9, 1)) }); // October has 31 days, November 30
    await screen.findByText('No responses this month');
    cell('2026-10-31').focus();
    await user.keyboard('{PageDown}');
    expect(screen.getByRole('heading', { name: /November 2026/ })).toBeInTheDocument();
    expect(cell('2026-11-30')).toHaveFocus();
  });

  it('Enter opens a day: its single response directly, several as a list', async () => {
    serve([
      response('solo', '2026-09-12T08:00:00.000Z'),
      response('x', '2026-09-20T08:00:00.000Z'),
      response('y', '2026-09-20T09:00:00.000Z'),
    ]);
    const user = userEvent.setup();
    draw();
    await within(cell('2026-09-12')).findByRole('button', { name: /Person solo/ });
    cell('2026-09-12').focus();
    await user.keyboard('{Enter}');
    expect(onView).toHaveBeenCalledWith('solo');
    cell('2026-09-20').focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('is one Tab stop, not one per day or per chip', async () => {
    serve([response('a', '2026-09-10T08:00:00.000Z')]);
    draw();
    await within(cell('2026-09-10')).findByRole('button', { name: /Person a/ });
    const stops = within(grid()).getAllByRole('gridcell').filter((c) => c.tabIndex === 0);
    expect(stops).toHaveLength(1);
    for (const chip of within(grid()).getAllByRole('button')) expect(chip.tabIndex).toBe(-1);
  });
});

describe('when something goes wrong', () => {
  it('keeps the month controls and offers to try again', async () => {
    mockGetResponses.mockRejectedValue(new Error('500'));
    const user = userEvent.setup();
    draw();
    expect(await screen.findByText('Unable to load the calendar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    mockGetResponses.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50, totalPages: 1 });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No responses this month')).toBeInTheDocument();
  });
});
