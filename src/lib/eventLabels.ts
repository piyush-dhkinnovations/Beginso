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
