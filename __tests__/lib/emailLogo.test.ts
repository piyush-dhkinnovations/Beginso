/**
 * Feature: email logo
 * Tests: the mail logo the backend points at (APP_URL + /email/beginso-logo.png) is really there, is a PNG, and has the shape the
 * mail draws it at (168 x 46), so it stays sharp and undistorted.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';

const FILE = 'public/email/beginso-logo.png';

describe('public/email/beginso-logo.png', () => {
  it('exists and is a real PNG', () => {
    expect(statSync(FILE).size).toBeGreaterThan(1000);
    const head = readFileSync(FILE).subarray(0, 8);
    expect(Array.from(head)).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it('is at least twice the 168px it is drawn at, with the same proportions (168 x 46)', () => {
    const buf = readFileSync(FILE);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBeGreaterThanOrEqual(336);
    expect(Math.abs(width / height - 168 / 46)).toBeLessThan(0.1);
  });

  it('stays small enough for an email (under 60 KB)', () => {
    expect(statSync(FILE).size).toBeLessThan(60 * 1024);
  });
});
