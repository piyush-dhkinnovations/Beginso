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
          {CAPABILITIES.map((group, groupIndex) => (
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
              {group.items.map((item, itemIndex) => {
                const isLastRow = groupIndex === CAPABILITIES.length - 1 && itemIndex === group.items.length - 1;
                return (
                <tr key={item.key}>
                  {/* Same fix as AuditTable's row header: `.bg-table th` (beginso-ui.css) styles
                      every <th> as a column label — uppercase, `--text-muted` (fails WCAG AA
                      contrast, 4.16:1 below 4.5:1), a `--bg-subtle` gray background, and a
                      darker `--border-default` bottom border that `.bg-table tbody tr:last-child
                      td` never strips (that rule only targets `td`, so the table's true last row
                      showed a stray line under Capability with none under any checkmark column).
                      This one is a row header holding a real capability sentence (e.g. "Create
                      forms"), not a label — without the rest of this fix it also sits in its own
                      gray stripe down the whole Capability column while every checkmark column
                      beside it stays white. */}
                  <th
                    scope="row"
                    className="font-normal text-left normal-case text-[var(--text-secondary)]"
                    style={{
                      backgroundColor: 'transparent',
                      borderBottom: isLastRow ? 0 : '1px solid var(--border-subtle)',
                    }}
                  >
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
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
