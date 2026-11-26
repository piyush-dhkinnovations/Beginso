import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { Wordmark } from '@/components/landing/Wordmark';
import { BRAND_MARK, WORDMARK_DARK, WORDMARK_LIGHT } from '@/lib/brand';

describe('Wordmark', () => {
  it('draws the light and dark logo from files the app serves itself', () => {
    render(<Wordmark />);
    const sources = screen.getAllByRole('img', { name: 'Beginso' }).map((i) => i.getAttribute('src'));
    expect(sources).toEqual([WORDMARK_LIGHT, WORDMARK_DARK]);
    for (const src of sources) expect(existsSync(`public${src!.split('?')[0]}`)).toBe(true);
  });

  it('draws the logo 2.85 times as wide as the height it is given, inside that height', () => {
    render(<Wordmark height={32} />);
    const [logo] = screen.getAllByRole('img', { name: 'Beginso' });
    expect(Number(logo.getAttribute('width'))).toBeCloseTo(91.2);
    const [, , artWidth, artHeight] = readFileSync('public/logo-full-light.svg', 'utf8').match(/viewBox="([^"]+)"/)![1].split(' ').map(Number);
    // The picture is fitted inside the box: the height it is really drawn at must not exceed it.
    expect(Number(logo.getAttribute('width')) / (artWidth / artHeight)).toBeLessThanOrEqual(32);
  });

  it('can be forced to one version, for a surface that is always dark', () => {
    render(<Wordmark force="dark" />);
    expect(screen.getByRole('img', { name: 'Beginso' })).toHaveAttribute('src', WORDMARK_DARK);
  });

  it('keeps the logos used before', () => {
    for (const file of ['favicon.svg', 'name-light.svg', 'name-dark.svg', 'logo-full-light.svg', 'logo-full-dark.svg', 'logo-light.svg', 'logo-dark.svg', 'email-beginso-logo.png']) {
      expect(existsSync(`public/old-logo/${file}`), file).toBe(true);
    }
    expect(readFileSync('public/old-logo/favicon.svg', 'utf8')).not.toBe(readFileSync('public/favicon.svg', 'utf8'));
  });
});

describe('logo files', () => {
  // A merge conflict left inside an SVG once shipped a broken logo to the live site.
  it('are each one valid drawing, with no merge conflict left inside', () => {
    for (const file of ['logo-full-light', 'logo-full-dark', 'name-light', 'name-dark', 'favicon', 'favicon-light', 'favicon-dark']) {
      const text = readFileSync(`public/${file}.svg`, 'utf8');
      expect(text, file).not.toMatch(/^(<{7}|={7}|>{7})/m);
      const drawing = new DOMParser().parseFromString(text, 'image/svg+xml');
      expect(drawing.querySelector('parsererror'), file).toBeNull();
      expect(drawing.documentElement.nodeName, file).toBe('svg');
    }
  });
});

describe('BRAND_MARK', () => {
  it('is the served mark, under an address that is not the one browsers cached the old logo at', () => {
    const [file, version] = BRAND_MARK.split('?');
    expect(existsSync(`public${file}`)).toBe(true);
    expect(version).toMatch(/^v=\d+$/);
  });
});

