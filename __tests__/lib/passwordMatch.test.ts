import { describe, expect, it } from 'vitest';
import { passwordMatch } from '@/lib/passwordMatch';

describe('passwordMatch', () => {
  it('says nothing until the confirmation field has text', () => {
    expect(passwordMatch('secret123', '')).toEqual({});
  });
  it('is a success when both match, an error when they differ', () => {
    expect(passwordMatch('secret123', 'secret123')).toEqual({ success: 'Passwords match' });
    expect(passwordMatch('secret123', 'secret12')).toEqual({ error: 'Passwords do not match' });
  });
});
