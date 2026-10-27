'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { DrillChart } from './DrillChart';
import { definitionOf, effectiveTitle, type WizardState } from './wizardState';
import { isDrill } from '@/lib/chartBuilder';
import type { FormField } from '@/types/form';
import type { DrillStep, QueryEntry } from '@/types/chartBuilder';

interface DrillPreviewCardProps {
  formId: string;
  scope: string | undefined;
  fields: readonly FormField[] | undefined;
  state: WizardState;
  heading?: string;
  /** The last step lists the levels under the chart. */
  showPath?: boolean;
}

/** Before the levels are added there is nothing to draw: say so, and where it comes from. */
export function DrillPlaceholder() {
  return (
    <Card className="flex min-h-60 flex-col items-center justify-center gap-1 text-center" role="region" aria-label="Preview">
      <p className="bg-body font-semibold text-(--text-primary)">Preview</p>
      <p className="max-w-sm bg-body-sm text-(--text-muted)">Add the levels in the next step to see your chart preview.</p>
    </Card>
  );
}

/**
 * The drill-down as the dashboard will show it, working: click a part to go a level deeper, use the path above the chart to go back.
 * The responses behind a part open in a side screen on the dashboard; in the wizard the chart is not saved yet, so this says how many.
 */
export function DrillPreviewCard({ formId, scope, fields, state, heading = 'Interactive preview', showPath }: DrillPreviewCardProps) {
  const definition = definitionOf(state);
  const title = effectiveTitle(fields, state);
  const [seen, setSeen] = useState<{ n: number | null; label: string } | null>(null);
  if (!isDrill(definition)) return null;

  const onSee = (steps: DrillStep[], entry: QueryEntry | null) => {
    const trail = [...steps.map((s) => s.entry.label), ...(entry ? [entry.label] : [])].join(' › ');
    setSeen({ n: entry ? entry.n : null, label: trail });
  };

  return (
    <Card className="flex flex-col gap-4" aria-label={heading} role="region">
      <div className="min-w-0">
        <h3 className="bg-body font-semibold text-(--text-primary)">{heading}</h3>
        <p className="break-words bg-body-sm text-(--text-muted)">{title || 'Untitled chart'}</p>
      </div>
      <DrillChart formId={formId} scope={scope} fields={fields} definition={definition} label={title || 'Chart'} onSeeResponses={onSee} showPath={showPath} />
      {seen && (
        <p role="status" className="rounded-md bg-(--bg-subtle) px-3 py-2 bg-body-sm text-(--text-secondary)">
          {seen.n !== null ? `${seen.n.toLocaleString()} ${seen.n === 1 ? 'response' : 'responses'} for ${seen.label}. ` : `${seen.label}. `}
          On the dashboard they open in a side screen.
        </p>
      )}
    </Card>
  );
}
