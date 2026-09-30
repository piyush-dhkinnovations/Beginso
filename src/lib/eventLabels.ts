import { shortId } from '@/lib/formatters';

// Display phrase for an event `action`. The backend owns the action list (design.md §13), so an
// unknown action falls back to its own text ("form.archived" → "form archived") rather than
// hiding the event.
const ACTION_PHRASES: Record<string, string> = {
  'form.published': 'published',
  'form.unpublished': 'unpublished',
  'form.moved': 'moved',
  'form.settings_changed': 'changed settings for',
  'form.deleted': 'deleted',
  'access.granted': 'granted access to',
  'access.revoked': 'revoked access to',
  'member.role_changed': 'changed a member role on',
  'member.removed': 'removed a member from',
  'session.revoked': 'revoked a session on',
  'export.created': 'exported responses from',
};

export function describeEventAction(action: string): string {
  return ACTION_PHRASES[action] ?? action.replace(/[._]/g, ' ');
}

// Bug fix: response-related events write `label: String(id)` at the source (every `recordEvent`
// call site for a response action) — the raw 24-char Mongo id, never a resolved #reference. Tag
// events already carry a real name here (tag create shows "piyush"/"test" correctly); only the
// response family shows the raw id. Shared by AuditTable and ActivityFeed, the two places that
// render `targetLabel`, so both read the same way rather than fixing it twice.
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
export function displayTargetLabel(label: string): string {
  return OBJECT_ID_RE.test(label) ? `#${shortId(label)}` : label;
}
