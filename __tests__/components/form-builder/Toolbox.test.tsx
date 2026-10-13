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
  it('opens only the first group by default; the others are collapsed', () => {
    renderToolbox();
    expect(screen.getByRole('button', { name: /Text & contact/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Choice & rating/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking a group heading opens that group only', async () => {
    renderToolbox();
    await userEvent.click(screen.getByRole('button', { name: /Choice & rating/ }));
    expect(screen.getByRole('button', { name: /Choice & rating/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Text & contact/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking a field tile adds that field type', async () => {
    const onAdd = renderToolbox();
    const text = screen.getByRole('region', { name: 'Text & contact' });
    fireEvent.click(within(text).getByTitle('Short Text'));
    expect(onAdd).toHaveBeenCalledWith('short_text');
  });

  it('search filters across groups, opens every group with a match and hides empty groups', async () => {
    renderToolbox();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search fields' }), 'upload');
    expect(screen.getByTitle('File Upload')).toBeInTheDocument();
    expect(screen.getByTitle('Image Upload')).toBeInTheDocument();
    expect(screen.queryByTitle('Short Text')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Text & contact' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Uploads & signature/ })).toHaveAttribute('aria-expanded', 'true');
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
