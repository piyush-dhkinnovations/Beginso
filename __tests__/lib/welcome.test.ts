import { describe, it, expect } from 'vitest';
import { welcomeTitle, WELCOME_DESCRIPTION } from '@/lib/welcome';

describe('welcomeTitle', () => {
  it('greets by first name', () => {
    expect(welcomeTitle('Piyush Prajapat')).toBe('Welcome back, Piyush');
    expect(welcomeTitle('  Mira   Shah ')).toBe('Welcome back, Mira');
    expect(welcomeTitle('Madonna')).toBe('Welcome back, Madonna');
  });

  it('is just "Welcome back" until the name is known', () => {
    expect(welcomeTitle()).toBe('Welcome back');
    expect(welcomeTitle(null)).toBe('Welcome back');
    expect(welcomeTitle('   ')).toBe('Welcome back');
  });

  it('has the one-line description both Home pages share', () => {
    expect(WELCOME_DESCRIPTION).toBe('Your forms and activity at a glance.');
  });
});
