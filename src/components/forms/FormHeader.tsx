import type { ReactNode } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface FormHeaderProps {
  /** Icon-only way back to the list: the app sidebar is hidden on form pages, so this is the exit. */
  onBack: () => void;
  backLabel: string;
  /** The form's name — plain text (view pages) or an editable field (builder). */
  title: ReactNode;
  /** Status badge shown beside the title. */
  badge?: ReactNode;
  /** Muted line under the title: created / updated dates, or the builder's save state. */
  meta?: ReactNode;
  /** Right-hand actions (Preview, Share, Edit form, ⋮ …). */
  actions?: ReactNode;
  /** The tab bar (FormSubNav). */
  nav: ReactNode;
}

const DATE = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

/** "05 Oct 2026, 5:20 PM" — empty string for a missing / invalid timestamp. */
export function formatFormDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : DATE.format(d).replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM');
}

/**
 * The one header every form page shares — Overview, Responses, Insights, Edit and Settings — so moving between
 * them never changes the frame: [back] [icon] title + status + dates ............ actions, then the tab bar.
 */
export function FormHeader({ onBack, backLabel, title, badge, meta, actions, nav }: FormHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="small" onClick={onBack} aria-label={`Back to ${backLabel}`} title={`Back to ${backLabel}`} className="bg-btn-icon shrink-0">
            <ArrowLeft size={18} className="bg-icon" />
          </Button>
          <span aria-hidden="true" className="inline-flex size-12 flex-none items-center justify-center rounded-2xl bg-(--accent-soft) text-(--action-primary) sm:size-13 [&_svg]:size-6">
            <FileText />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="min-w-0 truncate bg-h4 font-semibold text-(--text-primary) [&_input]:w-full">{title}</div>
              {badge}
            </div>
            {meta && <div className="min-w-0 truncate bg-caption text-(--text-muted)">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {nav}
    </header>
  );
}
