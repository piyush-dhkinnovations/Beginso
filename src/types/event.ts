// sprint-10-events-migration design.md §13. Backend contract to confirm (BE 0.1–0.5) — no backend
// repo is reachable from this checkout. `action` is deliberately `string`, not a union: the
// backend owns the action-type list and a frontend-locked union would need lockstep updates.
export interface WorkspaceEventItem {
  id: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  createdAt: string;
}

export interface AuditFilters {
  actorId?: string;
  range?: '7d' | '30d' | 'all';
  page?: number;
}
