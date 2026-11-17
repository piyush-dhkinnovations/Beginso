/**
 * A picture of a form inside the app (a template card, a Looks tile, a layout tile, the template preview page) must be drawn the way the form really
 * looks, which is light unless the owner chose otherwise, never in the viewer's own dark theme. beginso-ui.css makes that possible with a light scope:
 * the light tokens are also declared under [data-theme="light"], so an element that carries it re-declares them over the dark ones it inherits.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const css = fs.readFileSync(path.join(__dirname, '../../src/styles/beginso-ui.css'), 'utf8').replace(/\r\n/g, '\n');
const root = (p: string) => fs.readFileSync(path.join(__dirname, '../..', p), 'utf8').replace(/\r\n/g, '\n');

describe('the light scope', () => {
  it('re-declares every light token on [data-theme="light"], so it can undo an inherited dark theme', () => {
    expect(css).toMatch(/:root,\n\[data-theme="light"\] \{\n {2}\/\* ---- Brand primitives/);
    // every token the dark theme sets is one the light block also declares (otherwise it would leak through the scope)
    const lightBlock = css.slice(css.indexOf('[data-theme="light"] {'), css.indexOf('[data-theme="light"] { color-scheme'));
    const darkStart = css.indexOf('[data-theme="dark"] {');
    const darkBlock = css.slice(darkStart, css.indexOf('\n}', darkStart));
    const names = (s: string) => new Set([...s.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]));
    const light = names(lightBlock);
    expect([...names(darkBlock)].filter((n) => !light.has(n))).toEqual([]);
  });

  it('also asks the browser for light form controls inside it', () => {
    expect(css).toContain('[data-theme="light"] { color-scheme: light; }');
  });
});

describe('the pictures of a form that carry the light scope', () => {
  it.each([
    ['src/components/templates/TemplateThumb.tsx', 'data-theme="light"'],
    ['src/components/form-builder/LooksDialog.tsx', 'data-theme="light"'],
    ['src/components/form-builder/LayoutChooser.tsx', 'data-theme="light"'],
    ['src/components/form-builder/LookControls.tsx', 'data-theme="light"'],
    ['src/components/form-builder/BrandingStudio.tsx', 'data-theme="light"'],
  ])('%s', (file, needle) => {
    expect(root(file)).toContain(needle);
  });

  it('the template preview document is wrapped in FormThemeScope and skipped by the first-paint theme script', () => {
    expect(root('src/app/discover-templates/[slug]/preview/page.tsx')).toContain('<FormThemeScope>');
    expect(root('src/app/layout.tsx')).toContain('discover-templates[/][^/]+[/]preview');
  });
});
