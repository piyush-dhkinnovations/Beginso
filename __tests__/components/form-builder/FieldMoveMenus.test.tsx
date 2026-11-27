import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldPageMenu, FieldTypeMenu } from '@/components/form-builder/FieldMoveMenus';
import { FIELD_GROUPS, FIELD_TYPE_CONFIG } from '@/components/form-builder/Toolbox';
import { ToastProvider } from '@/components/ui/Toast';
import { useBuilderStore } from '@/store/builderStore';
import { makeField } from './builderTestUtils';

beforeEach(() => {
  useBuilderStore.setState({ fields: [], pages: [{ id: 'page-1', order: 0, title: 'Intro' }], activePageId: 'page-1', typeMemory: {} } as never);
});

describe('FieldPageMenu', () => {
  it('a single-page form offers no move icon', () => {
    render(<FieldPageMenu field={makeField('signature')} />);
    expect(screen.queryByRole('button', { name: /to another page/ })).not.toBeInTheDocument();
  });

  it('moves the field to the page picked', async () => {
    const f = makeField('dropdown', { label: 'Pick' });
    useBuilderStore.setState({ fields: [f], pages: [{ id: 'page-1', order: 0, title: 'Intro' }, { id: 'page-2', order: 1, title: 'Details' }] } as never);
    render(<FieldPageMenu field={f} />);
    await userEvent.click(screen.getByRole('button', { name: 'Move Pick to another page' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Details' }));
    expect(useBuilderStore.getState().fields[0].pageId).toBe('page-2');
  });
});

describe('FieldTypeMenu', () => {
  it('offers every field type under the toolbox groups, with the current one ticked', async () => {
    render(<FieldTypeMenu field={makeField('signature', { label: 'Sign' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Change the type of Sign' }));
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(FIELD_TYPE_CONFIG.length);
    for (const group of FIELD_GROUPS) expect(screen.getByText(group.label)).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Signature' })).toHaveAttribute('aria-checked', 'true');
  });

  it('searching finds a type, with its group named once', async () => {
    render(<FieldTypeMenu field={makeField('short_text', { label: 'Q' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Change the type of Q' }));
    await userEvent.keyboard('date');
    expect(screen.getAllByRole('menuitemradio').map((i) => i.textContent)).toEqual(['Date', 'Time', 'Date & Time']);
    expect(screen.getAllByText('Date & time')).toHaveLength(1);
  });

  it('the button is an icon alone', () => {
    render(<FieldTypeMenu field={makeField('long_text', { label: 'About' })} />);
    expect(screen.getByRole('button', { name: 'Change the type of About' })).toHaveTextContent('');
  });

  it('switches to a type of another kind', async () => {
    const f = makeField('dropdown', { label: 'Pick' });
    useBuilderStore.setState({ fields: [f] } as never);
    render(<FieldTypeMenu field={f} />);
    await userEvent.click(screen.getByRole('button', { name: 'Change the type of Pick' }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'File Upload' }));
    expect(useBuilderStore.getState().fields[0]).toMatchObject({ fieldId: f.fieldId, type: 'file_upload', label: 'Pick' });
  });

  it('says so when conditions are removed because the new type can never match them', async () => {
    const target = makeField('short_text');
    const source = makeField('dropdown', { label: 'Pick' });
    source.logicRules = [{ condition: { fieldId: source.fieldId, operator: 'equals', value: 'One' }, action: 'show', targetFieldId: target.fieldId }];
    useBuilderStore.setState({ fields: [source, target] } as never);
    render(
      <ToastProvider>
        <FieldTypeMenu field={source} />
      </ToastProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Change the type of Pick' }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Signature' }));
    expect(screen.getByText(/Removed a condition that checked this question/)).toBeInTheDocument();
    expect(useBuilderStore.getState().fields[0].logicRules).toEqual([]);
  });
});
