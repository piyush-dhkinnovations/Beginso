import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BoardCardSettings } from '@/components/responses/BoardCardSettings';
import { DEFAULT_BOARD_CARD } from '@/lib/boardCard';
import type { FormField } from '@/types/form';

vi.mock('@/services/responses', () => ({
  responsesService: { getResponses: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 1, totalPages: 1 }) },
}));
vi.mock('@/hooks/useFormFields', () => ({ useFormFields: () => FIELDS }));

const field = (fieldId: string, label: string, type: FormField['type'] = 'short_text') =>
  ({ fieldId, label, type, pageId: 'p', required: false, deleted: false, order: 0 }) as FormField;
const FIELDS = [field('n', 'Full name'), field('t', 'Title'), field('g', 'Genre'), field('s', 'Signature', 'signature')];

function open(config = DEFAULT_BOARD_CARD, onChange = vi.fn(), fields = FIELDS) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <BoardCardSettings scope="acme" formId="f1" fields={fields} config={config} onChange={onChange} />
    </QueryClientProvider>
  );
  return onChange;
}

describe('BoardCardSettings', () => {
  it('is not shown for a form with nothing a card could show', () => {
    open(DEFAULT_BOARD_CARD, vi.fn(), [field('s', 'Signature', 'signature')]);
    expect(screen.queryByRole('button', { name: /Card fields/ })).not.toBeInTheDocument();
  });

  it('is one choice, the card title, beside a preview of the card', async () => {
    open();
    await userEvent.click(screen.getByRole('button', { name: /Card fields/ }));
    expect(screen.getByRole('group', { name: 'Card preview' })).toBeInTheDocument();
    const select = screen.getByLabelText('Title') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.text)).toEqual(['Respondent name, or email', 'Full name', 'Title', 'Genre']);
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('picks the card title from the questions of the form', async () => {
    const onChange = open();
    await userEvent.click(screen.getByRole('button', { name: /Card fields/ }));
    await userEvent.selectOptions(screen.getByLabelText('Title'), 't');
    expect(onChange).toHaveBeenCalledWith({ title: 't' });
  });

  it('Reset goes back to the respondent name', async () => {
    const onChange = open({ title: 't' });
    await userEvent.click(screen.getByRole('button', { name: /Card fields/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_BOARD_CARD);
  });

  it('Reset is off while nothing is changed', async () => {
    open();
    await userEvent.click(screen.getByRole('button', { name: /Card fields/ }));
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });
});
