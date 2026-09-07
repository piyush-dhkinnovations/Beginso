/**
 * __tests__/lib/queryKeys.test.ts
 * Feature: sprint-8-workspaces-context, requirements.md §7.10, §16 — the query-key
 * namespacing regression test named in design.md §21.
 */

import { describe, it, expect } from 'vitest';
import { workspaceKeys } from '@/lib/queryKeys';

describe('workspaceKeys', () => {
  it('list() and detail() are stable, namespaced keys', () => {
    expect(workspaceKeys.list()).toEqual(['workspaces', 'list']);
    expect(workspaceKeys.detail('w1')).toEqual(['workspaces', 'detail', 'w1']);
  });

  describe('forms(context)', () => {
    it('differs by context even with identical params — proves no cross-context cache bleed', () => {
      const params = { search: 'x' };
      const personalKey = workspaceKeys.forms({ type: 'personal' }, params);
      const workspaceAKey = workspaceKeys.forms({ type: 'workspace', workspaceId: 'a' }, params);
      const workspaceBKey = workspaceKeys.forms({ type: 'workspace', workspaceId: 'b' }, params);

      expect(personalKey).not.toEqual(workspaceAKey);
      expect(workspaceAKey).not.toEqual(workspaceBKey);
    });

    it('produces a stable key for the personal context', () => {
      expect(workspaceKeys.forms({ type: 'personal' })).toEqual(['forms', 'personal', 'list', undefined]);
    });

    it('produces a stable key for a workspace context, including the workspaceId', () => {
      expect(workspaceKeys.forms({ type: 'workspace', workspaceId: 'w1' })).toEqual([
        'forms',
        'workspace',
        'w1',
        'list',
        undefined,
      ]);
    });
  });
});
