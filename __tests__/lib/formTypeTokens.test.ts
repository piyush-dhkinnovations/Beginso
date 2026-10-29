/**
 * A form with its own typeface sets --bg-font-sans on its wrapper. The type tokens (--text-h4, --text-body ...) are written with
 * var(--bg-font-sans), and a custom property is worked out where it is declared: declared only on :root they kept DM Sans, so a Lora form
 * had a serif input and a sans-serif title, label and button. The tokens are therefore declared on :root AND on .bg-form-type, which is on
 * the wrapper of every respondent form (the public form, the builder's preview and the guest canvas).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/styles/beginso-ui.css'), 'utf8').replace(/\r\n/g, '\n');
const TOKENS = ['display', 'h1', 'h2', 'h3', 'h4', 'h5', 'body-lg', 'body', 'body-sm', 'caption', 'button'];

describe('the type tokens of a form with its own typeface', () => {
  const block = /:root,\s*\.bg-form-type\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';

  it.each(TOKENS)('--text-%s is declared on :root and on .bg-form-type, in terms of --bg-font-sans', (name) => {
    expect(block).toMatch(new RegExp('--text-' + name + ': +[0-9]{3} [^;]*var[(]--bg-font-sans[)];'));
  });

  it('is declared once: the big :root block no longer repeats them (the two would drift apart)', () => {
    expect(css.split('--text-h4:').length - 1).toBe(1);
  });

  it('is on the wrapper of every respondent form', () => {
    for (const file of ['src/components/public-form/layouts/shared.tsx', 'src/components/guest/SimpleCanvas.tsx']) {
      expect(readFileSync(join(process.cwd(), file), 'utf8')).toContain('bg-form-type');
    }
  });
});
