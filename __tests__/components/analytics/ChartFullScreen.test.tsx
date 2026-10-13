import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/components/analytics/ChartBody', () => ({
  ChartBody: ({ onSelect }: { onSelect?: (t: unknown) => void }) => <button onClick={() => onSelect?.({ kind: 'segment' })}>chart-body</button>,
}));
vi.mock('@/components/analytics/DateRangeFilter', () => ({ DateRangeFilter: () => <div>range-filter</div> }));
const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: mockToast }) }));
const mockQuery = vi.fn();
vi.mock('@/hooks/useFieldDistribution', () => ({ useFieldDistribution: (a: unknown) => mockQuery(a) }));
const mockPng = vi.fn();
vi.mock('@/lib/exportChart', () => ({ chartPng: (a: unknown) => mockPng(a) }));
const mockDownload = vi.fn();
vi.mock('@/lib/csv', async (orig) => ({ ...(await orig<typeof import('@/lib/csv')>()), downloadBlob: (...a: unknown[]) => mockDownload(...a) }));

import { ChartFullScreen } from '@/components/analytics/ChartFullScreen';
import type { SavedChart } from '@/types/charts';
import type { FormField } from '@/types/form';

const field = { fieldId: 'f1', pageId: 'p', type: 'dropdown', label: 'Colour', required: false, deleted: false, order: 0, options: ['Red', 'Blue'] } as unknown as FormField;
const chart: SavedChart = {
  _id: 'c1', position: 0, fieldId: 'f1', type: 'donut', size: 'medium', title: 'Fav Colour!',
  options: { valueMode: 'count', legend: true, sort: 'value' }, visibility: 'private',
};
const buckets = [{ value: 'Red', count: 3, percentage: 75 }, { value: 'Blue', count: 1, percentage: 25 }];

function setup(over: Partial<React.ComponentProps<typeof ChartFullScreen>> = {}) {
  const onClose = vi.fn();
  const onSelect = vi.fn();
  render(<ChartFullScreen isOpen chart={chart} field={field} formId="form1" scope="personal" range={{}} onClose={onClose} onSelect={onSelect} {...over} />);
  return { onClose, onSelect };
}

describe('ChartFullScreen', () => {
  beforeEach(() => {
    mockToast.mockReset();
    mockDownload.mockReset();
    mockPng.mockReset();
    mockQuery.mockReset();
    mockQuery.mockReturnValue({ data: buckets, isLoading: false });
  });

  it('renders nothing when closed', () => {
    setup({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the title, chart type and field, and the data table', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Fav Colour!' })).toBeInTheDocument();
    expect(screen.getByText('Donut · Colour')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Red' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '75%' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument();
  });

  it('shows an empty message and disables exports with no data', () => {
    mockQuery.mockReturnValue({ data: [], isLoading: false });
    setup();
    expect(screen.getByText('No answers in this range.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PNG' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'CSV' })).toBeDisabled();
  });

  it('passes a segment selection up', async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();
    await user.click(screen.getByText('chart-body'));
    expect(onSelect).toHaveBeenCalledWith({ kind: 'segment' });
  });

  it('closes from the Close button and from Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Close full screen' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('exports a CSV with a total row and a slugged file name', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'CSV' }));
    expect(mockDownload).toHaveBeenCalledTimes(1);
    const [blob, name] = mockDownload.mock.calls[0] as [Blob, string];
    expect(name).toBe('fav-colour.csv');
    expect(blob.type).toBe('text/csv;charset=utf-8');
    const text = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsText(blob);
    });
    expect(text.replace('﻿', '').split('\r\n')).toEqual(['Colour,Responses,Share', 'Red,3,75%', 'Blue,1,25%', 'Total,4,']);
  });

  it('exports a PNG with a legend for pie/donut charts', async () => {
    const user = userEvent.setup();
    const png = new Blob(['x'], { type: 'image/png' });
    mockPng.mockResolvedValue(png);
    setup();
    await user.click(screen.getByRole('button', { name: 'PNG' }));
    await waitFor(() => expect(mockDownload).toHaveBeenCalledWith(png, 'fav-colour.png'));
    const arg = mockPng.mock.calls[0][0];
    expect(arg).toMatchObject({ title: 'Fav Colour!', subtitle: 'Donut chart of "Colour"' });
    expect(arg.legend.map((l: { label: string }) => l.label)).toEqual(['Red', 'Blue']);
  });

  it('shows an error toast when the PNG export fails', async () => {
    const user = userEvent.setup();
    mockPng.mockRejectedValue(new Error('boom'));
    setup();
    await user.click(screen.getByRole('button', { name: 'PNG' }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Could not export the chart as an image.', 'error'));
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it('shows the mean for an average chart and sends it as the big number', async () => {
    const user = userEvent.setup();
    mockQuery.mockReturnValue({ data: [{ value: '4', count: 3, percentage: 75 }, { value: '2', count: 1, percentage: 25 }], isLoading: false });
    mockPng.mockResolvedValue(new Blob());
    const rating = { ...field, type: 'rating', label: 'Score' } as unknown as FormField;
    setup({ chart: { ...chart, type: 'average', title: 'Avg' }, field: rating });
    expect(screen.getByText('Average 3.5 from 4 responses.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'PNG' }));
    await waitFor(() => expect(mockPng).toHaveBeenCalled());
    expect(mockPng.mock.calls[0][0]).toMatchObject({ big: '3.5', legend: undefined });
  });

  it('formats date buckets with readable labels', () => {
    mockQuery.mockReturnValue({ data: [{ value: '2026-09', count: 2, percentage: 100 }], isLoading: false });
    const date = { ...field, type: 'date', label: 'Visit' } as unknown as FormField;
    setup({ chart: { ...chart, type: 'line' }, field: date });
    expect(screen.queryByRole('cell', { name: '2026-09' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });
});
