/**
 * QA A13-014 / D7-004: about twenty routes still showed the bare "Beginso" tab title. Each route's layout now names its page
 * ("<Page> · Beginso", through the root title template).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROUTES: [string, string][] = [
  ['(user)/shared', 'Shared with me'],
  ['(user)/trash', 'Trash'],
  ['(user)/search', 'Search'],
  ['(user)/notifications', 'Notifications'],
  ['(user)/settings', 'Settings'],
  ['(user)/my-submissions', 'My submissions'],
  ['(user)/templates', 'Templates'],
  ['(user)/workspaces', 'Workspaces'],
  ['(standalone)/workspaces/new', 'New workspace'],
  ['discover-templates', 'Discover templates'],
  ['w/[slug]/roles', 'Roles & Permissions'],
  ['w/[slug]/team', 'Team'],
  ['w/[slug]/audit', 'Audit log'],
  ['w/[slug]/activity', 'Activity'],
  ['w/[slug]/settings', 'Workspace settings'],
  ['w/[slug]/notifications', 'Notifications'],
  ['w/[slug]/search', 'Search'],
  ['w/[slug]/templates', 'Templates'],
  ['w/[slug]/trash', 'Trash'],
];

describe('page titles', () => {
  it.each(ROUTES)('%s is titled "%s"', (route, title) => {
    const file = path.join(process.cwd(), 'src/app', route, 'layout.tsx');
    expect(fs.existsSync(file), `${route} has no layout.tsx`).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toContain(`title: ${JSON.stringify(title)}`);
  });

  it('every one of these routes also has a page (so the layout titles something real)', () => {
    for (const [route] of ROUTES) expect(fs.existsSync(path.join(process.cwd(), 'src/app', route, 'page.tsx')), route).toBe(true);
  });

  it('the root layout turns a page title into "<Page> · Beginso"', () => {
    const root = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    expect(root).toContain('template: "%s · Beginso"');
  });
});
