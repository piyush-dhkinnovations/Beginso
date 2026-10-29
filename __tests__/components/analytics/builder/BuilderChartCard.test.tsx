/**
 * The menu on a chart built in the chart builder: Size is one of its choices (the same Small / Medium / Large as the wizard), the one in use
 * is ticked, and choosing another hands the chart and the size over to the page. Moving a chart is done by dragging it, not from this menu.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SavedChart } from '@/types/charts';

const data = vi.hoisted(() => vi.fn());
vi.mock('@/services/chartBuilder', () => ({ chartBuilderService: { data, query: vi.fn() } }));
vi.mock('@/hooks/useFormFields', () => ({ useFormFields: () => [] }));

import { BuilderChartCard } from '@/components/analytics/builder/BuilderChartCard';

const CHART = {
  _id: 'c1',
  fieldId: 'plan',
  type: 'auto',
  size: 'medium',
  title: 'Plans',
  options: {},
  visibility: 'private',
  position: 0,
  kind: 'simple',
  version: 1,
  definition: { kind: 'simple', measure: { type: 'count' }, groupBy: { field: { kind: 'question', fieldId: 'plan' } } },
} as unknown as SavedChart;

function draw(onResize = vi.fn()) {
  data.mockReset().mockResolvedValue(undefined);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BuilderChartCard
        formId="f1"
        scope="personal"
        chart={CHART}
        canManage
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onToggleShare={vi.fn()}
        onRemove={vi.fn()}
        onResize={onResize}
      />
    </QueryClientProvider>,
  );
  return onResize;
}

describe('the chart card menu: size', () => {
  it('offers Small, Medium and Large, and choosing one tells the page which chart and which size', async () => {
    const onResize = draw();
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: 'Chart options for Plans' }));
    expect(screen.getByRole('menuitem', { name: 'Size: Small' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Size: Medium' })).toBeInTheDocument();
    await u.click(screen.getByRole('menuitem', { name: 'Size: Large' }));
    expect(onResize).toHaveBeenCalledWith(CHART, 'large');
  });

  it('has no Move earlier / Move later: the drag handle is how a chart is moved', async () => {
    draw();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Chart options for Plans' }));
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Move earlier|Move later/ })).not.toBeInTheDocument();
  });
});
