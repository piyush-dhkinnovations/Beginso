import { describe, expect, it } from 'vitest';
import { workspaceHeaders } from '@/lib/workspaceHeaders';

// Real bug (30 Sep 2026): omitting the header entirely for 'personal' let the backend's
// requirePermission fall back to the caller's own default workspace, so a user who was also a
// workspace member saw that workspace's data under the Personal shell. Sending the explicit
// 'personal' value is what makes the backend treat it as truly no workspace.
describe('workspaceHeaders', () => {
  it('sends an explicit personal signal, never omits the header, for the personal shell', () => {
    expect(workspaceHeaders('personal')).toEqual({ 'x-workspace-slug': 'personal' });
    expect(workspaceHeaders(undefined)).toEqual({ 'x-workspace-slug': 'personal' });
  });

  it('sends the real slug for a workspace scope', () => {
    expect(workspaceHeaders('acme')).toEqual({ 'x-workspace-slug': 'acme' });
  });
});
