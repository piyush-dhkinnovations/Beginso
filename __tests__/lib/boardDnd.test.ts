import { describe, it, expect, vi } from 'vitest';
import { columnDropId, stageIdOfDrop, columnKeyboardCoordinates } from '@/lib/boardDnd';

describe('column drop ids', () => {
  it('round-trips a stage id and never mistakes a card id for a column', () => {
    expect(stageIdOfDrop(columnDropId('s1'))).toBe('s1');
    expect(stageIdOfDrop('64f0c0ffee')).toBeNull();
    expect(stageIdOfDrop(undefined)).toBeNull();
    expect(stageIdOfDrop(42)).toBeNull();
  });
});

// Three 288px columns side by side, 16px apart.
const rect = (left: number) => ({ left, right: left + 288, top: 0, bottom: 400, width: 288, height: 400 });
const rects = new Map<string, ReturnType<typeof rect>>([
  ['stage:a', rect(0)],
  ['stage:b', rect(304)],
  ['stage:c', rect(608)],
]);
const containers = { getEnabled: () => [...rects.keys(), 'card-1'].map((id) => ({ id })) };

function press(code: string, cardLeft: number) {
  const event = { code, preventDefault: vi.fn() } as unknown as KeyboardEvent;
  const args = {
    active: 'card-1',
    currentCoordinates: { x: cardLeft, y: 50 },
    context: {
      active: { id: 'card-1' },
      droppableRects: rects,
      droppableContainers: containers,
      collisionRect: { left: cardLeft, top: 50, width: 270, height: 90, right: cardLeft + 270, bottom: 140 },
    },
  };
  const result = columnKeyboardCoordinates(event, args as any);
  return { result, event };
}

describe('columnKeyboardCoordinates (keyboard drag moves a column at a time, QA D8-008)', () => {
  it('ArrowRight jumps to the next column, centred in it, keeping the height', () => {
    const { result, event } = press('ArrowRight', 9);
    expect(result).toEqual({ x: 304 + (288 - 270) / 2, y: 50 });
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('ArrowLeft jumps back one column', () => {
    expect(press('ArrowLeft', 313).result).toEqual({ x: 0 + (288 - 270) / 2, y: 50 });
  });

  it('stays put at the first and last column', () => {
    expect(press('ArrowLeft', 9).result).toBeUndefined();
    expect(press('ArrowRight', 617).result).toBeUndefined();
  });

  it('ignores other keys (space, escape and enter are dnd-kit\'s own)', () => {
    const { result, event } = press('Space', 9);
    expect(result).toBeUndefined();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
