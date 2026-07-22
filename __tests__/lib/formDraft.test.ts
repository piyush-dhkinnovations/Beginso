/**
 * Feature: sprint-3-public-form (post-launch addition — draft persistence)
 * Tests for formDraft — save/load/clear round-trip, and graceful degradation
 * when storage is unavailable or holds garbage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveDraft, loadDraft, clearDraft } from '@/lib/formDraft';

describe('formDraft', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a saved draft', () => {
    saveDraft('my-slug', { pageIndex: 1, values: { a: 'hello', b: ['x', 'y'] } });
    expect(loadDraft('my-slug')).toEqual({ pageIndex: 1, values: { a: 'hello', b: ['x', 'y'] } });
  });

  it('returns null when nothing is saved for that slug', () => {
    expect(loadDraft('never-saved')).toBeNull();
  });

  it('keeps drafts for different slugs separate', () => {
    saveDraft('slug-a', { pageIndex: 0, values: { a: '1' } });
    saveDraft('slug-b', { pageIndex: 2, values: { b: '2' } });
    expect(loadDraft('slug-a')).toEqual({ pageIndex: 0, values: { a: '1' } });
    expect(loadDraft('slug-b')).toEqual({ pageIndex: 2, values: { b: '2' } });
  });

  it('returns null for corrupt JSON instead of throwing', () => {
    localStorage.setItem('beginso:draft:bad-slug', '{not valid json');
    expect(loadDraft('bad-slug')).toBeNull();
  });

  it('returns null for a validly-JSON but wrongly-shaped value', () => {
    localStorage.setItem('beginso:draft:wrong-shape', JSON.stringify(['not', 'an', 'object']));
    expect(loadDraft('wrong-shape')).toBeNull();
  });

  it('clearDraft removes the saved entry', () => {
    saveDraft('to-clear', { pageIndex: 0, values: { a: '1' } });
    clearDraft('to-clear');
    expect(loadDraft('to-clear')).toBeNull();
  });

  it('saveDraft does not throw when localStorage.setItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveDraft('quota-slug', { pageIndex: 0, values: {} })).not.toThrow();
    spy.mockRestore();
  });
});
