import { Fragment } from 'react';
import { Check, Minus } from 'lucide-react';
import { ROLE_LABELS, CAPABILITIES } from '@/lib/roles';
import type { Role } from '@/types/workspace';

const MATRIX_ROLES: Role[] = ['owner', 'admin', 'member', 'viewer'];

// Pure presentational (design.md §6/§7) — renders CAPABILITIES (src/lib/roles.ts), the single
// source also read by the sidebar's/table's capability gates, so the reference page and the
// actual gating can never silently drift apart (requirements.md §7.1/§7.6). No fetch, no state.
//
// Hand-rolled <table> in `ui/Table`'s own .bg-table-wrap/.bg-table scroll-container classes
// rather than the generic `ui/Table` component (design.md §15.2): Table.tsx always applies
// .bg-table-stack, which collapses to one-card-per-row below 640px — the deliberate exception
// this screen carries from the wireframe is that the matrix must NEVER stack (a capability/role
// pairing would be silently dropped), it only scrolls horizontally. Design.md §15.2 names this
// exact "plain semantic <table> wrapped in ui/Table's scroll container" as the accepted shape.
export function RolesMatrix() {
  return (
    <div className="bg-table-wrap">
      <table className="bg-table">
        <thead>
          <tr>
            <th scope="col">Capability</th>
            {MATRIX_ROLES.map((role) => (
              <th key={role} scope="col" className="text-center">
                {ROLE_LABELS[role]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAPABILITIES.map((group) => (
            <Fragment key={group.group}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={MATRIX_ROLES.length + 1}
                  className="bg-[var(--bg-subtle)] text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                >
                  {group.group}
                </th>
              </tr>
              {group.items.map((item) => (
                <tr key={item.key}>
                  <th scope="row" className="font-normal text-left">
                    {item.label}
                  </th>
                  {MATRIX_ROLES.map((role) => {
                    const allowed = item.roles.includes(role);
                    return (
                      <td key={role} className="text-center">
                        {allowed ? (
                          <Check size={14} className="inline text-[var(--text-primary)]" aria-hidden="true" />
                        ) : (
                          <Minus size={14} className="inline text-[var(--border-default)]" aria-hidden="true" />
                        )}
                        <span className="sr-only">{allowed ? 'Allowed' : 'Not allowed'}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
