import { describe, it, expect } from 'vitest';
import { describeEventAction, displayTargetLabel } from '@/lib/eventLabels';

describe('describeEventAction', () => {
  it.each([
    ['form.published', 'published'],
    ['access.granted', 'granted access to'],
    ['form.trash', 'moved to Trash'],
    ['workspace.transfer_ownership', 'transferred ownership of'],
  ])('maps %s', (action, phrase) => {
    expect(describeEventAction(action)).toBe(phrase);
  });

  it('falls back to the action text for unknown actions', () => {
    expect(describeEventAction('form.archived_x')).toBe('form archived x');
    expect(describeEventAction('a_b.c')).toBe('a b c');
  });

  it('adds the row count for report.create when it is a real number', () => {
    expect(describeEventAction('report.create', { rows: 142 })).toBe('exported 142 rows in a');
    expect(describeEventAction('report.create', { rows: 1 })).toBe('exported 1 row in a');
    expect(describeEventAction('report.create', { rows: 1234 })).toBe('exported 1,234 rows in a');
  });

  it('degrades to the plain phrase for a missing or non-numeric row count', () => {
    expect(describeEventAction('report.create')).toBe('exported a');
    expect(describeEventAction('report.create', null)).toBe('exported a');
    expect(describeEventAction('report.create', { rows: '5' })).toBe('exported a');
    expect(describeEventAction('report.create', { rows: NaN })).toBe('exported a');
  });

  it('ignores rows metadata on other actions', () => {
    expect(describeEventAction('report.download', { rows: 5 })).toBe('downloaded a');
  });
});

describe('displayTargetLabel', () => {
  it('turns a raw 24-char object id into a short #reference', () => {
    expect(displayTargetLabel('64b7f0c2a1b2c3d4e5f6a7b8')).toBe('#F6A7B8');
  });

  it('leaves real names alone, including near-miss ids', () => {
    expect(displayTargetLabel('Customer feedback')).toBe('Customer feedback');
    expect(displayTargetLabel('64b7f0c2a1b2c3d4e5f6a7b')).toBe('64b7f0c2a1b2c3d4e5f6a7b');
    expect(displayTargetLabel('zzb7f0c2a1b2c3d4e5f6a7b8')).toBe('zzb7f0c2a1b2c3d4e5f6a7b8');
  });
});
