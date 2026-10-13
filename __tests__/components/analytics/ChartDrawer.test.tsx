import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/components/analytics/ChartBody', () => ({
  ChartBody: ({ def }: { def: { type: string; title: string } }) => <div data-testid="preview">{def.type}|{def.title}</div>,
}));
const mockDistribution = vi.fn((_args: unknown) => ({ data: [], isLoading: false }));
vi.mock('@/hooks/useFieldDistribution', () => ({ useFieldDistribution: (a: unknown) => mockDistribution(a) }));

import { ChartDrawer } from '@/components/analytics/ChartDrawer';
import type { SavedChart } from '@/types/charts';
import type { FormField } from '@/types/form';

const field = (over: Record<string, unknown>) => ({ pageId: 'p', required: false, deleted: false, order: 0, ...over }) as unknown as FormField;
const fields: FormField[] = [
  field({ fieldId: 'f-text', type: 'short_text', label: 'Name', order: 0 }),
  field({ fieldId: 'f-drop', type: 'dropdown', label: 'Colour', order: 1, options: ['Red', 'Blue'] }),
  field({ fieldId: 'f-rate', type: 'rating', label: 'Score', order: 2 }),
  field({ fieldId: 'f-date', type: 'date', label: 'Visit date', order: 3 }),
];
const range = {};

function setup(over: Partial<React.ComponentProps<typeof ChartDrawer>> = {}) {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  render(
    <ChartDrawer isOpen onClose={onClose} editing={null} formId="form1" scope="personal" fields={fields} range={range} canShare isSaving={false} onSubmit={onSubmit} {...over} />,
  );
  return { onSubmit, onClose };
}

describe('ChartDrawer', () => {
  it('renders nothing when closed', () => {
    setup({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('titles itself for add vs edit', () => {
    const { unmount } = render(
      <ChartDrawer isOpen onClose={vi.fn()} editing={null} formId="f" scope="personal" fields={fields} range={range} canShare isSaving={false} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'Add chart' })).toBeInTheDocument();
    unmount();
    const chart: SavedChart = { _id: 'c1', position: 0, fieldId: 'f-rate', type: 'line', size: 'large', title: 'My chart', options: { valueMode: 'percent', legend: true, sort: 'original' }, visibility: 'private' };
    setup({ editing: chart });
    expect(screen.getByRole('heading', { name: 'Edit chart' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('My chart');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('only lists chartable questions, with their type label', () => {
    setup();
    const opts = screen.getAllByRole('option').map((o) => o.textContent);
    expect(opts).toEqual(['Colour (Dropdown)', 'Score (Rating)', 'Visit date (Date)']);
  });

  it('shows an explanation and Close when nothing is chartable', async () => {
    const user = userEvent.setup();
    const { onClose } = setup({ fields: [fields[0]] });
    expect(screen.getByText(/None of this form's questions can be charted yet/)).toBeInTheDocument();
    await user.click(screen.getByText('Close', { selector: 'button' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('defaults to the first chartable field, its first chart type, and the field label as title', () => {
    setup();
    expect(screen.getByLabelText('Question')).toHaveValue('f-drop');
    expect(screen.getByLabelText('Title')).toHaveValue('Colour');
    expect(screen.getByLabelText('Pie')).toBeChecked();
    expect(screen.getByTestId('preview')).toHaveTextContent('pie|Colour');
  });

  it('changing the question resets an incompatible type and follows the title until edited', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByLabelText('Donut'));
    await user.selectOptions(screen.getByLabelText('Question'), 'f-rate');
    expect(screen.getByLabelText('Title')).toHaveValue('Score');
    expect(screen.getByLabelText('Bar')).toBeChecked();
    expect(screen.queryByLabelText('Donut')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Average')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Mine');
    await user.selectOptions(screen.getByLabelText('Question'), 'f-date');
    expect(screen.getByLabelText('Title')).toHaveValue('Mine');
    expect(screen.getByLabelText('Line')).toBeInTheDocument();
    expect(screen.getByLabelText('Bar over time')).toBeInTheDocument();
  });

  it('blocks submit with an empty title and explains why', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.clear(screen.getByLabelText('Title'));
    expect(screen.getByText('Give the chart a title.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to dashboard' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only title as empty', async () => {
    const user = userEvent.setup();
    setup();
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), '   ');
    expect(screen.getByRole('button', { name: 'Add to dashboard' })).toBeDisabled();
  });

  it('submits the definition with a trimmed title and the chosen options', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), '  Favourite colour ');
    await user.click(screen.getByLabelText('Horizontal bar'));
    await user.click(screen.getByLabelText(/^Large/));
    await user.click(screen.getByRole('button', { name: 'Percentages' }));
    await user.click(screen.getByRole('switch', { name: 'Show legend' }));
    await user.click(screen.getByRole('button', { name: 'Add to dashboard' }));
    expect(onSubmit).toHaveBeenCalledWith({
      fieldId: 'f-drop',
      type: 'horizontal_bar',
      size: 'large',
      title: 'Favourite colour',
      options: { valueMode: 'percent', legend: false, sort: 'value' },
      visibility: 'private',
    });
  });

  it('hides Order for date questions and legend for non-choice questions', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByRole('group', { name: 'Sort by' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Show legend' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Question'), 'f-rate');
    expect(screen.getByRole('button', { name: 'Scale order' })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Show legend' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Question'), 'f-date');
    expect(screen.queryByRole('group', { name: 'Sort by' })).not.toBeInTheDocument();
  });

  it('offers workspace sharing only for a workspace scope and when allowed', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <ChartDrawer isOpen onClose={vi.fn()} editing={null} formId="f" scope="personal" fields={fields} range={range} canShare isSaving={false} onSubmit={vi.fn()} />,
    );
    expect(screen.queryByRole('switch', { name: /Share with workspace/ })).not.toBeInTheDocument();
    unmount();

    const { onSubmit } = setup({ scope: 'acme' });
    await user.click(screen.getByRole('switch', { name: /Share with workspace/ }));
    await user.click(screen.getByRole('button', { name: 'Add to dashboard' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'workspace' }));
  });

  it('hides sharing when canShare is false', () => {
    setup({ scope: 'acme', canShare: false });
    expect(screen.queryByRole('switch', { name: /Share with workspace/ })).not.toBeInTheDocument();
  });

  it('disables Cancel and shows loading while saving', () => {
    setup({ isSaving: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('Cancel calls onClose', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('requests the preview distribution for the selected field', () => {
    setup({ formId: 'form-9', scope: 'acme' });
    expect(mockDistribution).toHaveBeenCalledWith(expect.objectContaining({ formId: 'form-9', scope: 'acme', enabled: true, field: expect.objectContaining({ fieldId: 'f-drop' }) }));
  });
});
