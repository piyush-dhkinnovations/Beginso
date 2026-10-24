'use client';

import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { textFields } from '@/lib/answerText';
import type { Draft } from './draft';
import type { OpensAs, ResponseSort, RowHeight } from '@/types/responseSetup';
import type { FormField } from '@/types/form';

interface DefaultsTabProps {
  draft: Draft;
  onChange: (next: Draft) => void;
  fields: readonly FormField[] | undefined;
  /** The workspace's default stage name, for a form that has none of its own. */
  workspaceStartName: string;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-(--border-default) p-4">
      <h3 className="bg-body font-semibold text-(--text-primary)">{title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

/** How the page opens and how new responses arrive: the choices that are not about one table column or one card. */
export function DefaultsTab({ draft, onChange, fields, workspaceStartName }: DefaultsTabProps) {
  const v = draft.values;
  const set = (patch: Partial<Draft['values']>) => onChange({ ...draft, values: { ...v, ...patch } });
  const own = draft.stagesMode === 'own';

  return (
    <div className="flex flex-col gap-4">
      <Group title="When someone opens this form's responses">
        <Select id="opens-as" label="Opens as" value={v.opensAs} onChange={(e) => set({ opensAs: e.target.value as OpensAs })}>
          <option value="table">Table</option>
          <option value="board">Board</option>
          <option value="calendar">Calendar</option>
        </Select>
        <Select id="sort" label="Sorted by" value={v.sort} onChange={(e) => set({ sort: e.target.value as ResponseSort })}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
      </Group>

      <Group title="When a new response arrives">
        {own ? (
          <Select id="start-stage" label="New responses start in" value={String(draft.startIndex)} onChange={(e) => onChange({ ...draft, startIndex: Number(e.target.value) })}>
            {draft.stages.map((s, i) => (
              <option key={s.id ?? `new-${i}`} value={i}>
                {s.name.trim() || 'Unnamed stage'}
              </option>
            ))}
          </Select>
        ) : (
          <div className="bg-field">
            <span className="bg-label">New responses start in</span>
            <p className="bg-body-sm text-(--text-secondary)">{workspaceStartName}, the workspace&apos;s default stage. Give this form its own stages to choose another.</p>
          </div>
        )}
      </Group>

      <Group title="Who and how it looks">
        <Select
          id="respondent-from"
          label="Respondent name comes from"
          value={v.respondentFrom}
          onChange={(e) => set({ respondentFrom: e.target.value })}
        >
          <option value="auto">Found in the answers</option>
          {textFields(fields).map((f) => (
            <option key={f.fieldId} value={f.fieldId}>
              {f.label || 'Untitled question'}
            </option>
          ))}
        </Select>
        <Select id="row-height" label="Row height" value={v.rowHeight} onChange={(e) => set({ rowHeight: e.target.value as RowHeight })}>
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact: more rows on screen</option>
        </Select>
        <div className="bg-field md:col-span-2">
          <label htmlFor="wrap-answers" className="flex items-center gap-3">
            <Switch id="wrap-answers" checked={v.wrap} onChange={(wrap) => set({ wrap })} />
            <span className="flex flex-col">
              <span className="bg-body-sm font-medium text-(--text-primary)">Wrap long answers</span>
              <span className="bg-caption text-(--text-muted)">Off keeps one line per row and cuts a long answer short.</span>
            </span>
          </label>
        </div>
      </Group>
    </div>
  );
}
