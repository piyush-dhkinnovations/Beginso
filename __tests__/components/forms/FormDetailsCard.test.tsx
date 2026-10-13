import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormDetailsCard } from '@/components/forms/FormDetailsCard';
import { makeForm } from './formsTestUtils';
import type { Form } from '@/types/form';

const row = (label: string) => screen.getByText(label).closest('div') as HTMLElement;

describe('FormDetailsCard', () => {
  it('lists the read-only facts as a definition list', () => {
    const form = makeForm({
      status: 'published',
      fields: [{ fieldId: '1', pageId: 'p', type: 'short_text', label: 'A', required: false, deleted: false, order: 0 }, { fieldId: '2', pageId: 'p', type: 'email', label: 'B', required: false, deleted: false, order: 1 }],
      pages: [{ id: 'p', order: 0 }],
    });
    render(<FormDetailsCard form={form} createdBy="Asha" />);
    expect(screen.getByRole('heading', { name: 'Form details' })).toBeInTheDocument();
    expect(row('Status')).toHaveTextContent('Published');
    expect(row('Created by')).toHaveTextContent('Asha');
    expect(row('Created on')).toHaveTextContent('01 Oct 2026');
    expect(row('Last updated')).toHaveTextContent('02 Oct 2026');
    expect(row('Total questions')).toHaveTextContent('2');
    expect(row('Pages')).toHaveTextContent('1');
  });

  it('uses a dash when there is no creator and zeros when fields/pages are missing', () => {
    const form = { ...makeForm(), fields: undefined, pages: undefined } as unknown as Form;
    render(<FormDetailsCard form={form} />);
    expect(row('Created by')).toHaveTextContent('—');
    expect(row('Total questions')).toHaveTextContent('0');
    expect(row('Pages')).toHaveTextContent('0');
  });

  it('shows a dash for an unparsable date', () => {
    render(<FormDetailsCard form={makeForm({ createdAt: 'nope' })} />);
    expect(row('Created on')).toHaveTextContent('—');
  });

  it('shows Edit details only when an editHref is given', () => {
    const { rerender } = render(<FormDetailsCard form={makeForm()} />);
    expect(screen.queryByRole('link', { name: /Edit details/ })).not.toBeInTheDocument();
    rerender(<FormDetailsCard form={makeForm()} editHref="/forms/f1/edit" />);
    expect(screen.getByRole('link', { name: /Edit details/ })).toHaveAttribute('href', '/forms/f1/edit');
  });
});
