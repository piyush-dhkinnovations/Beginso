import { describe, it, expect } from 'vitest';
import { placeNear, isSamePlace, cardDropId, isCardDrop } from '@/lib/boardDnd';

const ids = ['a', 'b', 'c', 'd'];

describe('placeNear', () => {
  it('top half of a card puts the dropped card above it, with the card before it as the other neighbour', () => {
    expect(placeNear('s', ids, 'x', 'c', true)).toEqual({ stageId: 's', afterId: 'b', beforeId: 'c' });
  });

  it('bottom half puts it below', () => {
    expect(placeNear('s', ids, 'x', 'c', false)).toEqual({ stageId: 's', afterId: 'c', beforeId: 'd' });
  });

  it('above the first card has only a card below; below the last has only a card above', () => {
    expect(placeNear('s', ids, 'x', 'a', true)).toEqual({ stageId: 's', beforeId: 'a' });
    expect(placeNear('s', ids, 'x', 'd', false)).toEqual({ stageId: 's', afterId: 'd' });
  });

  it('leaves the dragged card out when it is in the same column', () => {
    // dragging b, over the top half of c: the neighbours are a and c, not b
    expect(placeNear('s', ids, 'b', 'c', true)).toEqual({ stageId: 's', afterId: 'a', beforeId: 'c' });
    // over the bottom half of a: a above, c below (b is not a neighbour of itself)
    expect(placeNear('s', ids, 'b', 'a', false)).toEqual({ stageId: 's', afterId: 'a', beforeId: 'c' });
  });

  it('an empty column, or no card under the pointer, means the end', () => {
    expect(placeNear('s', [], 'x', null, true)).toEqual({ stageId: 's' });
    expect(placeNear('s', ids, 'x', null, true)).toEqual({ stageId: 's', afterId: 'd' });
  });
});

describe('isSamePlace', () => {
  it('is true when the card would stay between the same neighbours', () => {
    expect(isSamePlace({ stageId: 's', afterId: 'a', beforeId: 'c' }, 's', ids, 'b')).toBe(true);
    expect(isSamePlace({ stageId: 's', afterId: 'a' }, 's', ['a', 'b'], 'b')).toBe(true);
  });

  it('is false for another spot or another column', () => {
    expect(isSamePlace({ stageId: 's', afterId: 'c', beforeId: 'd' }, 's', ids, 'b')).toBe(false);
    expect(isSamePlace({ stageId: 't', afterId: 'a', beforeId: 'c' }, 's', ids, 'b')).toBe(false);
  });
});

describe('card drop ids', () => {
  it('are told apart from column ids', () => {
    expect(isCardDrop(cardDropId('r1'))).toBe(true);
    expect(isCardDrop('stage:s1')).toBe(false);
  });
});
