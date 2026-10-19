import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldMoveMenus } from '@/components/form-builder/FieldMoveMenus';
import { useBuilderStore } from '@/store/builderStore';
import { makeField } from './builderTestUtils';

beforeEach(() => {
  useBuilderStore.setState({ fields: [], pages: [{ id: 'page-1', order: 0, title: 'Intro' }], activePageId: 'page-1' } as never);
});

describe('FieldMoveMenus', () => {
  it('a single-page form offers no move icon; a field that cannot change type offers no swap icon', () => {
    render(<FieldMoveMenus field={makeField('signature')} />);
    expect(screen.queryByRole('button', { name: /to another page/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Change the type/ })).not.toBeInTheDocument();
  });

  it('moves the field to the page picked and swaps the type picked', async () => {
    const f = makeField('dropdown', { label: 'Pick' });
    useBuilderStore.setState({ fields: [f], pages: [{ id: 'page-1', order: 0, title: 'Intro' }, { id: 'page-2', order: 1, title: 'Details' }] } as never);
    render(<FieldMoveMenus field={f} />);
    await userEvent.click(screen.getByRole('button', { name: 'Change the type of Pick' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Checkbox' }));
    expect(useBuilderStore.getState().fields[0].type).toBe('checkbox');
    await userEvent.click(screen.getByRole('button', { name: 'Move Pick to another page' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Details' }));
    expect(useBuilderStore.getState().fields[0].pageId).toBe('page-2');
  });
});
