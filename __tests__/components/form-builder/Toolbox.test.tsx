import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { Toolbox, FIELD_GROUPS, FIELD_TYPE_CONFIG } from '@/components/form-builder/Toolbox';

function renderToolbox(onAdd = vi.fn()) {
  render(
    <DndContext>
      <Toolbox onAdd={onAdd} />
    </DndContext>
  );
  return onAdd;
}

describe('FIELD_TYPE_CONFIG', () => {
  it('has a unique type per entry, every entry in a known group, and file_upload present', () => {
    const types = FIELD_TYPE_CONFIG.map((c) => c.type);
    expect(new Set(types).size).toBe(types.length);
    const groups = FIELD_GROUPS.map((g) => g.id);
    FIELD_TYPE_CONFIG.forEach((c) => expect(groups).toContain(c.group));
    expect(types).toContain('file_upload');
  });
});

describe('Toolbox', () => {
  it('shows every group at once, each under a plain heading: nothing is hidden behind a menu', () => {
    renderToolbox();
    for (const g of FIELD_GROUPS) {
      const section = screen.getByRole('region', { name: g.label });
      expect(within(section).getByRole('heading', { name: g.label })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /Choice & rating/ })).not.toBeInTheDocument();
    expect(screen.getByTitle('Dropdown')).toBeInTheDocument();
    expect(screen.getByTitle('Signature')).toBeInTheDocument();
  });

  it('clicking a field tile adds that field type', async () => {
    const onAdd = renderToolbox();
    const text = screen.getByRole('region', { name: 'Text & contact' });
    fireEvent.click(within(text).getByTitle('Short Text'));
    expect(onAdd).toHaveBeenCalledWith('short_text');
  });

  it('search filters across groups and hides empty groups', async () => {
    renderToolbox();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search fields' }), 'upload');
    expect(screen.getByTitle('File Upload')).toBeInTheDocument();
    expect(screen.getByTitle('Image Upload')).toBeInTheDocument();
    expect(screen.queryByTitle('Short Text')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Text & contact' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Uploads & signature' })).toBeInTheDocument();
  });

  it('search is case-insensitive and trimmed', async () => {
    renderToolbox();
    await userEvent.type(screen.getByRole('searchbox'), '  EMAIL ');
    expect(screen.getByTitle('Email')).toBeInTheDocument();
  });

  it('shows a no-match message', async () => {
    renderToolbox();
    await userEvent.type(screen.getByRole('searchbox'), 'zzzz');
    expect(screen.getByText('No fields match “zzzz”.')).toBeInTheDocument();
  });
});
