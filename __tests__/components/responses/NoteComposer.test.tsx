import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteComposer } from '@/components/responses/NoteComposer';
import type { MemberListItem } from '@/types/team';

const member = (userId: string, name: string) =>
  ({ membershipId: `m-${userId}`, userId, name, email: `${userId}@x.com`, avatarUrl: null, role: 'member', isOwner: false, lastActiveAt: null }) as MemberListItem;
const members = [member('u1', 'Asha Rao'), member('u2', 'Ben Lee')];

const box = () => screen.getByRole('combobox');

describe('NoteComposer', () => {
  it('posts a trimmed note on the send button and clears itself', async () => {
    const onSubmit = vi.fn();
    render(<NoteComposer members={members} onSubmit={onSubmit} />);
    await userEvent.type(box(), '  hello team  ');
    await userEvent.click(screen.getByRole('button', { name: 'Post note' }));
    expect(onSubmit).toHaveBeenCalledWith('hello team', []);
    expect(box()).toHaveValue('');
  });

  it('submits on Enter', async () => {
    const onSubmit = vi.fn();
    render(<NoteComposer members={members} onSubmit={onSubmit} />);
    await userEvent.type(box(), 'quick{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('quick', []);
  });

  it('Shift+Enter and Ctrl+Enter insert a new line instead of submitting', async () => {
    const onSubmit = vi.fn();
    render(<NoteComposer members={members} onSubmit={onSubmit} />);
    await userEvent.type(box(), 'a{Shift>}{Enter}{/Shift}b');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(box()).toHaveValue('a\nb');
    await userEvent.type(box(), '{Control>}{Enter}{/Control}c');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(box()).toHaveValue('a\nb\nc');
  });

  it('puts the cursor right after an inserted new line immediately, not on a later animation frame (typing fast used to land in the wrong place)', () => {
    render(<NoteComposer members={members} onSubmit={vi.fn()} />);
    const el = box() as HTMLTextAreaElement;
    fireEvent.change(el, { target: { value: 'ab' } });
    el.setSelectionRange(1, 1);
    fireEvent.keyDown(el, { key: 'Enter', shiftKey: true });
    // No timers and no frames awaited: the cursor must already sit after the new line (index 2 of "a<newline>b").
    expect(el).toHaveValue('a\nb');
    expect(el.selectionStart).toBe(2);
    expect(el.selectionEnd).toBe(2);
    fireEvent.keyDown(el, { key: 'Enter', ctrlKey: true });
    expect(el).toHaveValue('a\n\nb');
    expect(el.selectionStart).toBe(3);
  });

  it('rejects an empty note with an alert and does not call onSubmit', async () => {
    const onSubmit = vi.fn();
    render(<NoteComposer members={members} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Post note' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Note cannot be empty');
    expect(box()).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a note over 5000 characters', async () => {
    const onSubmit = vi.fn();
    render(<NoteComposer members={members} onSubmit={onSubmit} />);
    fireEvent.change(box(), { target: { value: 'x'.repeat(5001) } });
    await userEvent.click(screen.getByRole('button', { name: 'Post note' }));
    expect(screen.getByRole('alert')).toHaveTextContent('5000 characters or fewer');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('@ opens the mention picker; selecting adds a chip, strips the query and submits the id', async () => {
    const onSubmit = vi.fn();
    render(<NoteComposer members={members} onSubmit={onSubmit} />);
    await userEvent.type(box(), 'hi @as');
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(await screen.findByRole('option', { name: /Asha Rao/ }));
    expect(box()).toHaveValue('hi ');
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('@Asha Rao')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Post note' }));
    expect(onSubmit).toHaveBeenCalledWith('hi', ['u1']);
  });

  it('Enter does not submit while the mention picker is open', async () => {
    const onSubmit = vi.fn();
    render(<NoteComposer members={members} onSubmit={onSubmit} />);
    await userEvent.type(box(), '@');
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('removes a mention chip', async () => {
    const onSubmit = vi.fn();
    render(<NoteComposer members={members} onSubmit={onSubmit} initialBody="note" initialMentionIds={['u2']} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove mention of Ben Lee' }));
    expect(screen.queryByText('@Ben Lee')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith('note', []);
  });

  it('inserts an emoji from the picker and closes it', async () => {
    render(<NoteComposer members={members} onSubmit={vi.fn()} />);
    await userEvent.type(box(), 'ok');
    await userEvent.click(screen.getByRole('button', { name: 'Add an emoji' }));
    expect(screen.getByRole('listbox', { name: 'Add an emoji' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: '🎉' }));
    expect(box()).toHaveValue('ok🎉');
    expect(screen.queryByRole('listbox', { name: 'Add an emoji' })).not.toBeInTheDocument();
  });

  it('closes the emoji picker on an outside click', async () => {
    render(<NoteComposer members={members} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add an emoji' }));
    expect(screen.getByRole('listbox', { name: 'Add an emoji' })).toBeInTheDocument();
    await userEvent.click(document.body);
    expect(screen.queryByRole('listbox', { name: 'Add an emoji' })).not.toBeInTheDocument();
  });

  it('edit mode labels the button Save and shows Cancel', async () => {
    const onCancel = vi.fn();
    render(<NoteComposer members={members} onSubmit={vi.fn()} initialBody="old" onCancel={onCancel} />);
    expect(box()).toHaveValue('old');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('has no Cancel in compose mode, and disables Cancel while submitting', () => {
    const { rerender } = render(<NoteComposer members={members} onSubmit={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    rerender(<NoteComposer members={members} onSubmit={vi.fn()} onCancel={vi.fn()} isSubmitting />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Post note' })).toBeDisabled();
  });
});
