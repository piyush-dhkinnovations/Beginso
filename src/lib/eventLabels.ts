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
  // Sprint 14 (B5.3): the report queue's own events. The row count, when the event carries it, is
  // appended by `describeEventDetail` - never assumed present.
  'report.create': 'exported a',
  'report.download': 'downloaded a',
  'form.unpublish': 'unpublished',
  'form.regenerate_link': 'generated a new link for',
  'form.archive': 'archived',
  'form.unarchive': 'unarchived',
  'form.trash': 'moved to Trash',
  'form.restore': 'restored',
  'form.purge': 'permanently deleted',
  'response.restore': 'restored a response on',
  'response.purge': 'permanently deleted a response on',
  'response.edit_after_review': 'edited their submission after review on',
  'response.clear_edited_after_review': 'marked a respondent edit as reviewed on',
  'template.publish': 'published a template from',
  'template.remove': 'removed a template',
  'access_grant.create': 'shared',
  'access_grant.revoke': 'removed access to',
  'form.create': 'created',
  'form.close': 'closed',
  'form.duplicate': 'duplicated',
  'form.move': 'moved',
  'invitation.send': 'invited a member to',
  'invitation.accept': 'accepted an invitation to',
  'invitation.decline': 'declined an invitation to',
  'invitation.resend': 'resent an invitation to',
  'invitation.revoke': 'revoked an invitation to',
  'member.leave': 'left',
  'member.remove': 'removed a member from',
  'member.role_change': 'changed a member role in',
  'response.submit': 'received a response on',
  'response.delete': 'deleted a response on',
  'response.note_add': 'added a note on',
  'response.stage_change': 'changed the stage of',
  'response.status_change': 'changed the status of',
  'response.offboard_unassign': 'unassigned responses from',
  'chart.create': 'added a chart to',
  'chart.delete': 'removed a chart from',
  'workspace.create': 'created',
  'workspace.update': 'updated',
  'workspace.delete': 'deleted',
  'workspace.export': 'exported',
  'workspace.transfer_ownership': 'transferred ownership of',
};

// `metadata` is optional - Sprint 14 (B5.3): report events read a row count from it, and only when it
// is a real number ("exported 142 rows in a"). Anything else, or an unknown action, degrades to the
// plain phrase / generic text; this never throws.
export function describeEventAction(action: string, metadata?: Record<string, unknown> | null): string {
  const phrase = ACTION_PHRASES[action] ?? action.replace(/[._]/g, ' ');
  const rows = metadata?.rows;
  if (action === 'report.create' && typeof rows === 'number' && Number.isFinite(rows)) {
    return `exported ${rows.toLocaleString('en')} ${rows === 1 ? 'row' : 'rows'} in a`;
  }
  return phrase;
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
