/**
 * __tests__/lib/formatters.test.ts
 * Feature: sprint-4-responses
 * Tests: formatFileSize, formatResponseDate, parseUserAgent, shortId, buildAnswerPreview
 * Requirements: 10.1, 10.2
 */

import { describe, it, expect } from 'vitest';
import { formatFileSize, formatResponseDate, parseUserAgent, shortId, buildAnswerPreview } from '@/lib/formatters';
import type { ResponseAnswers } from '@/types/response';

describe('formatFileSize', () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });
  it('returns bytes below 1 KB as-is', () => {
    expect(formatFileSize(1023)).toBe('1023 B');
  });
  it('formats KB with 1 decimal', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(348160)).toBe('340.0 KB');
  });
  it('formats MB with 1 decimal', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
  });
});

describe('formatResponseDate', () => {
  it('formats a valid ISO string as "DD MMM YYYY, HH:MM"', () => {
    const result = formatResponseDate('2026-08-03T14:32:00.000Z');
    expect(result).toMatch(/^\d{2} \w{3} \d{4}, \d{2}:\d{2}$/);
  });
  it('returns "—" for an invalid string', () => {
    expect(formatResponseDate('not-a-date')).toBe('—');
  });
});

describe('parseUserAgent', () => {
  it('parses a Chrome/Windows UA', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
    expect(parseUserAgent(ua)).toBe('Chrome 125 on Windows');
  });
  it('parses a Safari/iOS UA', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(parseUserAgent(ua)).toBe('Safari 17 on iOS');
  });
  it('falls back to "Unknown browser on Unknown OS" for an unrecognised or empty UA', () => {
    expect(parseUserAgent('')).toBe('Unknown browser on Unknown OS');
    expect(parseUserAgent('some-bot/1.0')).toBe('Unknown browser on Unknown OS');
  });
});

describe('shortId', () => {
  it('returns the last 6 chars uppercased for a 24-char ObjectId', () => {
    expect(shortId('6b1f0e2a9497f0a0ea093ba3')).toBe('093BA3');
  });
  it('returns the full string uppercased when shorter than 6 chars', () => {
    expect(shortId('a1b')).toBe('A1B');
  });
});

describe('buildAnswerPreview', () => {
  it('joins the first two non-null answers with " · "', () => {
    const answers: ResponseAnswers = { Name: 'Priya', Email: 'priya@example.com', Age: 30 };
    expect(buildAnswerPreview(answers)).toBe('Priya · priya@example.com');
  });
  it('skips null/undefined/empty values', () => {
    const answers: ResponseAnswers = { Name: null, Nickname: '', Email: 'priya@example.com' };
    expect(buildAnswerPreview(answers)).toBe('priya@example.com');
  });
  it('joins array values with ", "', () => {
    const answers: ResponseAnswers = { Topics: ['Design', 'Dev'] };
    expect(buildAnswerPreview(answers)).toBe('Design, Dev');
  });
  it('returns an empty string for an empty object', () => {
    expect(buildAnswerPreview({})).toBe('');
  });
  it('truncates the joined preview at 60 characters', () => {
    const answers: ResponseAnswers = { Bio: 'x'.repeat(80) };
    expect(buildAnswerPreview(answers).length).toBe(60);
  });
});
