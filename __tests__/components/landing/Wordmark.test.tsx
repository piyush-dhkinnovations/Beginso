import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { Wordmark } from '@/components/landing/Wordmark';
import { BRAND_MARK } from '@/lib/brand';

describe('Wordmark', () => {
  it('draws the light and dark logo from files the app serves itself', () => {
    render(<Wordmark />);
    const sources = screen.getAllByRole('img', { name: 'Beginso' }).map((i) => i.getAttribute('src'));
    expect(sources).toEqual(['/name-light.svg', '/name-dark.svg']);
    for (const src of sources) expect(existsSync(`public${src}`)).toBe(true);
  });

  it('can be forced to one version, for a surface that is always dark', () => {
    render(<Wordmark force="dark" />);
    expect(screen.getByRole('img', { name: 'Beginso' })).toHaveAttribute('src', '/name-dark.svg');
  });

  it('keeps the logos used before', () => {
    for (const file of ['favicon.svg', 'name-light.svg', 'name-dark.svg', 'logo-full-light.svg', 'logo-full-dark.svg', 'logo-light.svg', 'logo-dark.svg', 'email-beginso-logo.png']) {
      expect(existsSync(`public/old-logo/${file}`), file).toBe(true);
    }
    expect(readFileSync('public/old-logo/favicon.svg', 'utf8')).not.toBe(readFileSync('public/favicon.svg', 'utf8'));
  });
});

describe('BRAND_MARK', () => {
  it('is the served mark, under an address that is not the one browsers cached the old logo at', () => {
    const [file, version] = BRAND_MARK.split('?');
    expect(existsSync(`public${file}`)).toBe(true);
    expect(version).toMatch(/^v=\d+$/);
  });
});

