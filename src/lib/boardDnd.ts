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

// Cards are drop targets too, so a card can be dropped between two others. Named "card:<responseId>" for the same reason as the columns.
export const CARD_PREFIX = 'card:';
export const cardDropId = (responseId: string) => `${CARD_PREFIX}${responseId}`;
export const isCardDrop = (dropId: unknown): dropId is string => typeof dropId === 'string' && dropId.startsWith(CARD_PREFIX);

/** Where a card was (or would be) dropped: a column, and the cards that end up directly above and below it there. */
export interface DropPlace {
  stageId: string;
  afterId?: string;
  beforeId?: string;
}

/**
 * Works out the drop place from the card the pointer is nearest to and which half of it the pointer is in. `ids` is the column's cards
 * top to bottom; the card being dragged is left out, so "above" and "below" are the cards that will really be its neighbours.
 */
export function placeNear(stageId: string, ids: readonly string[], draggedId: string, overId: string | null, overTopHalf: boolean): DropPlace {
  const rest = ids.filter((id) => id !== draggedId);
  if (rest.length === 0) return { stageId };
  if (!overId || overId === draggedId) return { stageId, afterId: rest[rest.length - 1] };
  const at = rest.indexOf(overId);
  if (at === -1) return { stageId, afterId: rest[rest.length - 1] };
  const index = overTopHalf ? at : at + 1; // the card goes before rest[index]
  return { stageId, ...(index > 0 ? { afterId: rest[index - 1] } : {}), ...(index < rest.length ? { beforeId: rest[index] } : {}) };
}

/** True when dropping at `place` leaves the card exactly where it already is. */
export function isSamePlace(place: DropPlace, fromStageId: string | undefined, ids: readonly string[], draggedId: string): boolean {
  if (place.stageId !== fromStageId) return false;
  const rest = ids.filter((id) => id !== draggedId);
  const now = ids.indexOf(draggedId);
  if (now === -1) return false;
  const index = place.afterId ? rest.indexOf(place.afterId) + 1 : place.beforeId ? rest.indexOf(place.beforeId) : 0;
  return index === now;
}
