/**
 * One colour per form status, shared by badges (StatusBadge: published = success, draft = outline, closed = error)
 * and the charts, so "Closed" is never green in one place and red in another (A12-006). Existing tokens only.
 */
export type FormStatusKey = 'published' | 'draft' | 'closed';

export const FORM_STATUS_COLOR: Record<FormStatusKey, string> = {
  published: 'var(--success)',
  draft: 'var(--text-muted)',
  closed: 'var(--error)',
};
