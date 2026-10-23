import { describe, it, expect } from 'vitest';
import { answerFor, answerLine, cardFields, parseBoardCard, DEFAULT_BOARD_CARD } from '@/lib/boardCard';
import type { FormField } from '@/types/form';

const field = (fieldId: string, label: string, type: FormField['type'] = 'short_text', deleted = false) =>
  ({ fieldId, label, type, pageId: 'p', required: false, deleted, order: 0 }) as FormField;

describe('parseBoardCard', () => {
  it('is the default for nothing, for junk and for the wrong shape', () => {
    expect(parseBoardCard('')).toEqual(DEFAULT_BOARD_CARD);
    expect(parseBoardCard(null)).toEqual(DEFAULT_BOARD_CARD);
    expect(parseBoardCard('{not json')).toEqual(DEFAULT_BOARD_CARD);
    expect(parseBoardCard('{"title":42,"extras":"x"}')).toEqual(DEFAULT_BOARD_CARD);
  });

  it('keeps a valid choice and ignores anything else stored with it', () => {
    expect(parseBoardCard('{"title":"f1"}')).toEqual({ title: 'f1' });
    expect(parseBoardCard('{"title":"f1","extras":["f2"]}')).toEqual({ title: 'f1' });
  });
});

describe('cardFields', () => {
  it('leaves out deleted questions and the ones that are not text (signature, uploads)', () => {
    const fields = [
      field('a', 'Name'),
      field('b', 'Old', 'short_text', true),
      field('c', 'Sign', 'signature'),
      field('d', 'File', 'file_upload'),
      field('e', 'Pic', 'image_upload'),
      field('f', 'Budget', 'number'),
    ];
    expect(cardFields(fields).map((f) => f.fieldId)).toEqual(['a', 'f']);
    expect(cardFields(undefined)).toEqual([]);
  });
});

describe('answerLine', () => {
  it('turns an answer into one line, or nothing', () => {
    expect(answerLine('  Hello ')).toBe('Hello');
    expect(answerLine(12)).toBe('12');
    expect(answerLine(true)).toBe('Yes');
    expect(answerLine(false)).toBe('No');
    expect(answerLine(['Drama', 'Comedy'])).toBe('Drama, Comedy');
    expect(answerLine({ city: 'Pune', state: '', country: 'India' })).toBe('Pune, India');
    expect(answerLine('')).toBeUndefined();
    expect(answerLine(null)).toBeUndefined();
    expect(answerLine([])).toBeUndefined();
    expect(answerLine('data:image/png;base64,AAAA')).toBeUndefined();
  });
});

describe('answerFor', () => {
  it('reads the answer by the question label, then by id, and numbers repeated labels the way the API does', () => {
    const fields = [field('a', 'Name'), field('b', 'Name'), field('c', 'City')];
    const answers = { Name: 'Asha', 'Name (2)': 'Second', City: 'Pune' };
    expect(answerFor(answers, fields, fields[0])).toBe('Asha');
    expect(answerFor(answers, fields, fields[1])).toBe('Second');
    expect(answerFor({ c: 'By id' }, fields, fields[2])).toBe('By id');
    expect(answerFor({}, fields, fields[2])).toBeUndefined();
  });
});
