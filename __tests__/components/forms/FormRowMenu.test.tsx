import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildFormMenuItems, renderPinButton, renderRowMenu } from '@/components/forms/FormRowMenu';
import { makeForm, makeState } from './formsTestUtils';
import type { FormsContext } from '@/types/workspace';

const personal: FormsContext = { type: 'personal' };
const ws: FormsContext = { type: 'workspace', workspaceId: 'w9' };
const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe('buildFormMenuItems', () => {
  it('a full-rights personal list offers every action in order', () => {
    const items = buildFormMenuItems(makeForm(), makeState(), personal);
    expect(ids(items)).toEqual(['edit', 'overview', 'responses', 'analytics', 'select', 'pin', 'move', 'share', 'duplicate', 'archive', 'publish-template', 'delete']);
  });

  it('navigation items push the form routes, carrying ?ws= only in a workspace', () => {
    const s = makeState();
    buildFormMenuItems(makeForm({ _id: 'abc' }), s, personal).find((i) => i.id === 'edit')!.onSelect!();
    expect(s.router.push).toHaveBeenLastCalledWith('/forms/abc/edit');

    const s2 = makeState();
    const items = buildFormMenuItems(makeForm({ _id: 'abc' }), s2, ws);
    items.find((i) => i.id === 'responses')!.onSelect!();
    expect(s2.router.push).toHaveBeenLastCalledWith('/forms/abc/inbox?ws=w9');
    items.find((i) => i.id === 'analytics')!.onSelect!();
    expect(s2.router.push).toHaveBeenLastCalledWith('/forms/abc/insights?ws=w9');
  });

  it('hides Delete, Select and Publish-to-template per capability', () => {
    const items = buildFormMenuItems(makeForm(), makeState({ canDelete: false, canMakeTemplate: false, canArchive: false }), personal);
    expect(ids(items)).not.toContain('delete');
    expect(ids(items)).not.toContain('select');
    expect(ids(items)).not.toContain('publish-template');
    expect(ids(items)).not.toContain('archive');
  });

  it('hides Select once the user is already selecting', () => {
    expect(ids(buildFormMenuItems(makeForm(), makeState({ selecting: true }), personal))).not.toContain('select');
  });

  it('has no pin item on the Archived tab, and Archive becomes Unarchive', () => {
    const s = makeState({ onArchivedTab: true });
    const items = buildFormMenuItems(makeForm({ _id: 'x' }), s, personal);
    expect(ids(items)).not.toContain('pin');
    const archive = items.find((i) => i.id === 'archive')!;
    expect(archive.label).toBe('Unarchive');
    archive.onSelect!();
    expect(s.archiveMutation.mutate).toHaveBeenCalledWith({ ids: ['x'], archive: false });
  });

  it('pin toggles to the opposite of the current state', () => {
    const s = makeState();
    const pinned = buildFormMenuItems(makeForm({ _id: 'p', pinned: true }), s, personal).find((i) => i.id === 'pin')!;
    expect(pinned.label).toBe('Unpin');
    pinned.onSelect!();
    expect(s.pinMutation.mutate).toHaveBeenCalledWith({ id: 'p', pin: false });

    const unpinned = buildFormMenuItems(makeForm({ _id: 'p' }), s, personal).find((i) => i.id === 'pin')!;
    expect(unpinned.label).toBe('Pin to top');
  });

  it('shows in-flight labels and disables the row being duplicated, archived or deleted', () => {
    const f = makeForm({ _id: 'busy' });
    const items = buildFormMenuItems(f, makeState({ duplicatingId: 'busy', archivingId: 'busy', deletingId: 'busy' }), personal);
    const get = (id: string) => items.find((i) => i.id === id)!;
    expect(get('duplicate')).toMatchObject({ label: 'Duplicating…', disabled: true });
    expect(get('archive')).toMatchObject({ label: 'Updating…', disabled: true });
    expect(get('delete')).toMatchObject({ label: 'Moving to Trash…', disabled: true, danger: true });
  });

  it('does not mark other rows as busy', () => {
    const items = buildFormMenuItems(makeForm({ _id: 'me' }), makeState({ duplicatingId: 'other' }), personal);
    expect(items.find((i) => i.id === 'duplicate')).toMatchObject({ label: 'Duplicate', disabled: false });
  });

  it('modal-opening items hand the form to the page state', () => {
    const s = makeState();
    const form = makeForm();
    const items = buildFormMenuItems(form, s, personal);
    items.find((i) => i.id === 'move')!.onSelect!();
    items.find((i) => i.id === 'share')!.onSelect!();
    items.find((i) => i.id === 'publish-template')!.onSelect!();
    items.find((i) => i.id === 'delete')!.onSelect!();
    items.find((i) => i.id === 'select')!.onSelect!();
    items.find((i) => i.id === 'duplicate')!.onSelect!();
    expect(s.setFormToMove).toHaveBeenCalledWith(form);
    expect(s.setFormToShare).toHaveBeenCalledWith(form);
    expect(s.setFormToTemplate).toHaveBeenCalledWith(form);
    expect(s.setFormToDelete).toHaveBeenCalledWith(form);
    expect(s.toggleSelected).toHaveBeenCalledWith('f1');
    expect(s.duplicateMutation.mutate).toHaveBeenCalledWith('f1');
  });
});

describe('renderRowMenu', () => {
  it('renders an accessible trigger that opens the menu with the actions', async () => {
    const s = makeState();
    render(renderRowMenu(makeForm({ title: 'Survey' }), s, personal));
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Survey' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(s.duplicateMutation.mutate).toHaveBeenCalledWith('f1');
  });
});

describe('renderPinButton', () => {
  it('renders a pin toggle that flips the pinned state', async () => {
    const s = makeState();
    render(<>{renderPinButton(makeForm({ title: 'Survey', pinned: true }), s)}</>);
    await userEvent.click(screen.getByRole('button', { name: 'Unpin Survey' }));
    expect(s.pinMutation.mutate).toHaveBeenCalledWith({ id: 'f1', pin: false });
  });

  it('renders nothing on the Archived tab (archived forms cannot be pinned)', () => {
    expect(renderPinButton(makeForm(), makeState({ onArchivedTab: true }))).toBeNull();
  });
});
