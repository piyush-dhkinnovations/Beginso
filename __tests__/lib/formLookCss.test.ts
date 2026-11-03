/**
 * The CSS for branding.theme only matches when the owner chose that look (a data attribute on .form-look), so a form without a theme is drawn as it
 * always was. The one block that applies to every form declares defaults equal to what the classes used before.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const file = path.join(__dirname, '../../src/styles/form-look.css');
const section = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const start = section.indexOf(':root,');

/** Every selector in the section, with the at-rule it sits in (if any). */
function selectors(): string[] {
  const body = section.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: string[] = [];
  for (const m of body.matchAll(/([^{}]+)\{/g)) {
    const text = m[1].trim();
    if (text.startsWith('@')) continue;
    out.push(...text.split(',').map((s) => s.trim()));
  }
  return out;
}

describe('the form look CSS', () => {
  it('exists', () => {
    expect(start).toBeGreaterThan(0);
    expect(selectors().length).toBeGreaterThan(10);
  });

  it('applies to every form only through the defaults block; every other rule needs a data attribute the owner switched on', () => {
    const open = selectors().filter((s) => !s.includes('[data-'));
    expect(open).toEqual([':root', '.form-look']);
  });

  it('the defaults equal what the field classes drew before the theme existed', () => {
    const defaults = section.slice(0, section.indexOf('}'));
    expect(defaults).toContain('--form-field-bg: var(--surface-card)');
    expect(defaults).toContain('--form-field-border: var(--border-default)');
    expect(defaults).toContain('--form-field-radius: 8px');
    expect(defaults).toContain('--form-heading: var(--text-primary)');
  });

  it('the line under a filled or underlined field is the AA muted text colour, so at least 3 to 1 on a card', () => {
    expect(section).toContain('--form-field-edge: var(--text-muted)');
  });

  it('is imported without a layer, after Tailwind, so it can beat a utility class on the same property', () => {
    const globals = fs.readFileSync(path.join(__dirname, '../../src/app/globals.css'), 'utf8').replace(/\r\n/g, '\n');
    expect(globals).toContain('@import "tailwindcss";\n@import "../styles/form-look.css";');
    expect(globals).not.toMatch(/form-look\.css"\s+layer/);
  });

  it('never uses a bg- prefixed marker class (the cn() helper would drop it)', () => {
    expect(section).not.toMatch(/\.bg-(form-look|field-input|choice|form-card|form-width|form-fields)/);
  });
});
