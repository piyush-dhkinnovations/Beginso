import type { KeyboardCoordinateGetter } from '@dnd-kit/core';

// The Board's drag and drop (QA D8-008). Column drop targets are named "stage:<stageId>" so they can never be mistaken for a card id.
export const COLUMN_PREFIX = 'stage:';
export const columnDropId = (stageId: string) => `${COLUMN_PREFIX}${stageId}`;
/** The stage id a drop target stands for, or null when it is not a column. */
export const stageIdOfDrop = (dropId: unknown): string | null => (typeof dropId === 'string' && dropId.startsWith(COLUMN_PREFIX) ? dropId.slice(COLUMN_PREFIX.length) : null);

/**
 * Keyboard dragging: Left / Right jumps the picked-up card to the next / previous column (dnd-kit's default moves 25px per key press,
 * which is useless across 288px-wide columns). Space picks up and drops, Escape cancels, as dnd-kit already does.
 */
export const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context: { active, droppableRects, droppableContainers, collisionRect } }) => {
  if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return undefined;
  if (!active || !collisionRect) return undefined;
  event.preventDefault();

  const columns = droppableContainers
    .getEnabled()
    .filter((c) => String(c.id).startsWith(COLUMN_PREFIX))
    .map((c) => ({ id: c.id, rect: droppableRects.get(c.id) }))
    .filter((c): c is { id: typeof c.id; rect: NonNullable<typeof c.rect> } => !!c.rect)
    .sort((a, b) => a.rect.left - b.rect.left);

  const centre = collisionRect.left + collisionRect.width / 2;
  const current = columns.findIndex((c) => centre >= c.rect.left && centre <= c.rect.right);
  const target = columns[(current === -1 ? 0 : current) + (event.code === 'ArrowRight' ? 1 : -1)];
  if (!target) return undefined; // already at the first / last column

  return { x: target.rect.left + (target.rect.width - collisionRect.width) / 2, y: collisionRect.top };
};
