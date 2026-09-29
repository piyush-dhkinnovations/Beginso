/**
 * __tests__/lib/queryKeys.test.ts
 * Feature: sprint-8-workspaces-context, requirements.md §7.10, §16 — the query-key
 * namespacing regression test named in design.md §21.
 */

import { describe, it, expect } from 'vitest';
import {
  workspaceKeys, teamKeys, invitationKeys, formAccessKeys, sharedKeys,
  formKeys, formEventKeys, activityKeys, auditKeys, responseKeys, stageKeys,
} from '@/lib/queryKeys';

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

// Sprint 9 (team-permissions), design.md §10/§21 — proves teamKeys is workspace-namespaced from
// creation, matching workspaceKeys.forms()'s own regression test above: switching workspaces
// must never serve another workspace's cached member/invitation list.
describe('teamKeys', () => {
  it('members() differs across workspaces', () => {
    expect(teamKeys.members('a')).not.toEqual(teamKeys.members('b'));
  });

  it('invitations() differs across workspaces', () => {
    expect(teamKeys.invitations('a')).not.toEqual(teamKeys.invitations('b'));
  });

  it('members() and invitations() differ from each other within the same workspace', () => {
    expect(teamKeys.members('a')).not.toEqual(teamKeys.invitations('a'));
  });

  it('produces stable keys', () => {
    expect(teamKeys.members('w1')).toEqual(['team', 'w1', 'members']);
    expect(teamKeys.invitations('w1')).toEqual(['team', 'w1', 'invitations']);
  });
});

describe('invitationKeys / formAccessKeys / sharedKeys', () => {
  it('invitationKeys.detail() is namespaced per token', () => {
    expect(invitationKeys.detail('tok-a')).not.toEqual(invitationKeys.detail('tok-b'));
  });

  it('formAccessKeys.grants() is namespaced per form', () => {
    expect(formAccessKeys.grants('form-a')).not.toEqual(formAccessKeys.grants('form-b'));
  });

  it('sharedKeys.list() is stable and caller-scoped implicitly (no id param — one caller per session)', () => {
    expect(sharedKeys.list()).toEqual(['shared-with-me', 'list']);
  });
});

// Sprint 10 (events-migration), design.md §10 / tasks.md 1.3.
describe('activityKeys / auditKeys / formEventKeys', () => {
  it('activityKeys.list() differs across workspaces', () => {
    expect(activityKeys.list('a')).not.toEqual(activityKeys.list('b'));
  });

  it('auditKeys.list() differs across workspaces — no cross-workspace cache bleed', () => {
    expect(auditKeys.list('a', {})).not.toEqual(auditKeys.list('b', {}));
  });

  it('auditKeys.list() differs by filters', () => {
    expect(auditKeys.list('a', { range: '7d' })).not.toEqual(auditKeys.list('a', { range: '30d' }));
  });

  it('formEventKeys.list() differs by page and by limit (preview vs drawer never share an entry)', () => {
    expect(formEventKeys.list('f', 1)).not.toEqual(formEventKeys.list('f', 2));
    expect(formEventKeys.list('f', 1, 6)).not.toEqual(formEventKeys.list('f', 1, 20));
  });

  it('formKeys.overview() is namespaced per form', () => {
    expect(formKeys.overview('a')).not.toEqual(formKeys.overview('b'));
    expect(formKeys.overview('a')).toEqual(['form', 'a', 'overview']);
  });
});

// Sprint 12 (inbox-collaboration), design.md §10, task 1.4 — resolves OQ-1's frontend half.
// responseKeys/stageKeys gain a scope segment; two scopes must never share a key.
describe('responseKeys / stageKeys — scope-namespaced (Sprint 12)', () => {
  it('responseKeys.all() differs across scopes', () => {
    expect(responseKeys.all('personal')).not.toEqual(responseKeys.all('acme'));
  });

  it('responseKeys.list() differs across scopes with identical params/formId', () => {
    expect(responseKeys.list('personal', 'f1', {})).not.toEqual(responseKeys.list('acme', 'f1', {}));
  });

  it('responseKeys.detail() differs across scopes for the same response id', () => {
    expect(responseKeys.detail('personal', 'r1')).not.toEqual(responseKeys.detail('acme', 'r1'));
  });

  it('responseKeys.stats() differs across scopes', () => {
    expect(responseKeys.stats('personal')).not.toEqual(responseKeys.stats('acme'));
  });

  it('stageKeys.list() differs across scopes', () => {
    expect(stageKeys.list('acme')).not.toEqual(stageKeys.list('other'));
  });
});
