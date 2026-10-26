import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NoteItem } from '@/components/responses/NoteItem';
import type { Note } from '@/types/note';

const note = (body: string): Note =>
  ({ id: 'n1', body, authorId: 'u1', authorName: 'Asha Rao', authorRemoved: false, mentions: [], createdAt: '2026-10-26T10:00:00.000Z', editedAt: null }) as unknown as Note;

describe('NoteItem', () => {
  it('a long unbroken string wraps inside its bubble instead of running out of it', () => {
    const long = 'sdvjsdvs;dvb;sdvb;sdbvsbdvjsdvb;dbv;dvdbvjasdvj'.repeat(8);
    render(
      <ul>
        <NoteItem note={note(long)} members={[]} isOwn canDeleteAny={false} onEdit={vi.fn()} onDelete={vi.fn()} />
      </ul>,
    );
    const bubble = screen.getByText(long);
    expect(bubble.className).toMatch(/break-words/);
    expect(bubble.className).toMatch(/overflow-wrap:anywhere/);
    expect(bubble.className).toMatch(/max-w-full/);
  });
});
