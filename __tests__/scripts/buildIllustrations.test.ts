import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = resolve(process.cwd(), 'scripts/build-illustrations.mjs');

describe('build-illustrations', () => {
  it('does not leave re-formed comment delimiters in generated SVG markup', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'beginso-illustrations-'));

    try {
      mkdirSync(join(fixture, 'illustrations-src'));
      mkdirSync(join(fixture, 'src/components/illustrations'), { recursive: true });
      writeFileSync(join(fixture, 'illustrations-src/not-found.svg'), '<svg><<!---->!--</svg>');

      execFileSync(process.execPath, [script], { cwd: fixture });

      const generated = readFileSync(
        resolve(fixture, 'src/components/illustrations/illustrations.generated.ts'),
        'utf8',
      );
      expect(generated).toContain('<svg');
      expect(generated).not.toContain('<!--');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
