/**
 * Feature: the form's accent colours (progress bar, chosen answer, focus ring) follow the brand colour
 * Tests: only a form that has a theme (a look) follows it; a form without one is left as it was; a bad colour is ignored.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { brandLookProps } from '@/lib/formTheme';
import { LookScope } from '@/components/public-form/layouts/shared';
import type { PublicFormBranding } from '@/types/publicForm';

const ACCENT_KEYS = ['--action-primary', '--action-primary-hover', '--accent-soft', '--accent-soft-hover', '--accent-soft-text'];
const accentOf = (style: Record<string, unknown>) => ACCENT_KEYS.filter((k) => k in style);

describe('brandLookProps: accent colours', () => {
  it('a form with a theme takes its accents from the brand colour', () => {
    const { style } = brandLookProps({ theme: { v: 1, card: { radius: 8 } }, primaryColor: '#C4491C' });
    const s = style as Record<string, string>;
    expect(s['--action-primary']).toBe('#C4491C');
    expect(s['--action-primary-hover']).toContain('#C4491C');
    expect(s['--accent-soft']).toContain('#C4491C');
    expect(accentOf(s)).toEqual(ACCENT_KEYS);
  });

  it('an old form with no theme is left exactly as it was', () => {
    expect(accentOf(brandLookProps({ theme: undefined, primaryColor: '#C4491C' }).style as Record<string, unknown>)).toEqual([]);
    expect(accentOf(brandLookProps({ theme: null as never, primaryColor: '#C4491C' }).style as Record<string, unknown>)).toEqual([]);
  });

  it('a theme with no brand colour, or a colour that is not a hex value, changes nothing', () => {
    expect(accentOf(brandLookProps({ theme: { v: 1, card: { radius: 8 } } }).style as Record<string, unknown>)).toEqual([]);
    for (const bad of ['red', 'javascript:alert(1)', '#12', '#GGGGGG', 'url(x)', '']) {
      expect(accentOf(brandLookProps({ theme: { v: 1, card: { radius: 8 } }, primaryColor: bad }).style as Record<string, unknown>)).toEqual([]);
    }
  });

  it('keeps the other theme values it already set', () => {
    const { style } = brandLookProps({ theme: { v: 1, colors: { text: '#111111' }, card: { radius: 12 } }, primaryColor: '#2457D6' });
    const s = style as Record<string, string>;
    expect(s['--text-primary']).toBe('#111111');
    expect(s['--form-card-radius']).toBe('12px');
    expect(s['--action-primary']).toBe('#2457D6');
  });
});

describe('LookScope on the public form', () => {
  const scoped = (b: PublicFormBranding) => {
    const { container } = render(<LookScope branding={b}>x</LookScope>);
    return (container.firstChild as HTMLElement).style;
  };

  it('paints the accents of a themed form with its brand colour', () => {
    expect(scoped({ primaryColor: '#0E7C86', theme: { v: 1, card: { radius: 14 } } } as PublicFormBranding).getPropertyValue('--action-primary')).toBe('#0E7C86');
  });

  it('leaves a form without a theme on the app colours', () => {
    expect(scoped({ primaryColor: '#0E7C86' } as PublicFormBranding).getPropertyValue('--action-primary')).toBe('');
  });
});
