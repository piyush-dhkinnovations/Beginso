import { describe, it, expect } from 'vitest';
import { disambiguateActors } from '@/lib/auditActors';

describe('disambiguateActors', () => {
  it('adds the email only to names that appear more than once (QA A9-008: "test", "test", "Jayesh")', () => {
    const out = disambiguateActors([
      { id: '1', name: 'test', email: 'a@x.com' },
      { id: '2', name: 'Test', email: 'b@x.com' },
      { id: '3', name: 'Jayesh', email: 'j@x.com' },
    ]);
    expect(out).toEqual([
      { id: '1', name: 'test (a@x.com)' },
      { id: '2', name: 'Test (b@x.com)' },
      { id: '3', name: 'Jayesh' },
    ]);
  });

  it('keeps a shared name as it is when there is no email to tell people apart', () => {
    expect(disambiguateActors([{ id: '1', name: 'test' }, { id: '2', name: 'test' }])).toEqual([
      { id: '1', name: 'test' },
      { id: '2', name: 'test' },
    ]);
  });
});
