'use client';

import type { ReactNode } from 'react';
import { BarChart3, Briefcase, CalendarCheck, ClipboardList, Eye, FileText, MoreVertical, Plus, ShoppingCart, Star } from 'lucide-react';
import type { Template } from '@/types/form';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { bx } from '@/lib/utils';

// One tint per category, drawn from semantic tokens so it follows every theme. Unknown
// categories (the backend's list is open-ended) fall back to a neutral tint.
const TINTS: Record<string, { surface: string; ink: string; icon: ReactNode }> = {
  advanced: { surface: 'var(--accent-soft)', ink: 'var(--accent-soft-text)', icon: <BarChart3 /> },
  general: { surface: 'var(--success-surface)', ink: 'var(--success-text)', icon: <ClipboardList /> },
  feedback: { surface: 'var(--info-surface)', ink: 'var(--info-text)', icon: <Star /> },
  hr: { surface: 'var(--warning-surface)', ink: 'var(--warning-text)', icon: <Briefcase /> },
  events: { surface: 'var(--accent-soft)', ink: 'var(--accent-soft-text)', icon: <CalendarCheck /> },
  sales: { surface: 'var(--bg-sunken)', ink: 'var(--text-secondary)', icon: <ShoppingCart /> },
};
const FALLBACK_TINT = { surface: 'var(--bg-sunken)', ink: 'var(--text-secondary)', icon: <FileText /> };

export const categoryTint = (category: string) => TINTS[category.toLowerCase()] ?? FALLBACK_TINT;

export interface TemplateCardProps {
  template: Template;
  onUse: (id: string) => void;
  onPreview: (template: Template) => void;
  isLoading: boolean;
  /** Horizontal, two-column "featured" layout — used for a lone last card so the grid has no hole. */
  wide?: boolean;
}

/** Small stand-in for a form: a sheet with skeleton lines, in the category's ink colour. */
function MiniForm({ ink }: { ink: string }) {
  return (
    <div aria-hidden="true" className="w-36 rounded-md border border-(--border-default) bg-(--surface-card) p-2.5 shadow-(--shadow-sm)">
      <div className="mb-2 h-1.5 w-14 rounded-full" style={{ backgroundColor: ink }} />
      <div className="mb-1.5 h-1.5 w-full rounded-full bg-(--border-default)" />
      <div className="mb-1.5 h-1.5 w-4/5 rounded-full bg-(--border-default)" />
      <div className="mb-2 h-4 w-full rounded border border-(--border-default) bg-(--bg-sunken)" />
      <div className="h-3.5 w-12 rounded" style={{ backgroundColor: ink, opacity: 0.85 }} />
    </div>
  );
}

export function TemplateCard({ template, onUse, onPreview, isLoading, wide }: TemplateCardProps) {
  const tint = categoryTint(template.category);
  const count = template.fields.length;

  return (
    <Card padded={false} className={bx('overflow-hidden', wide && 'sm:col-span-2 sm:flex-row')}>
      <div
        className={bx('relative flex items-center justify-center', wide ? 'shrink-0 py-6 sm:w-64' : 'h-32')}
        style={{ background: `linear-gradient(135deg, ${tint.surface}, var(--bg-subtle))` }}
      >
        <span
          className="absolute left-3 top-3 inline-flex items-center rounded-full bg-(--surface-card) px-2.5 py-0.5 bg-caption font-semibold capitalize"
          style={{ color: tint.ink }}
        >
          {template.category}
        </span>
        <div className="flex items-center gap-3">
          <MiniForm ink={tint.ink} />
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-(--surface-card) shadow-(--shadow-sm)"
            style={{ color: tint.ink }}
          >
            {tint.icon}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="bg-h5 text-(--text-primary)">{template.name}</h3>
          <Menu
            trigger={<MoreVertical className="bg-icon" />}
            triggerLabel={`More options for ${template.name}`}
            align="end"
            items={[
              { id: 'preview', label: 'Preview', icon: <Eye className="bg-icon" />, onSelect: () => onPreview(template) },
              { id: 'use', label: 'Use template', icon: <Plus className="bg-icon" />, onSelect: () => onUse(template._id), disabled: isLoading },
            ]}
          />
        </div>
        <p className="bg-body-sm flex-1 text-(--text-muted)">{template.description}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span className="inline-flex items-center gap-1.5 bg-body-sm text-(--text-muted)">
            <FileText size={14} aria-hidden="true" />
            {count} {count === 1 ? 'field' : 'fields'}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="small" onClick={() => onPreview(template)}>
              Preview
            </Button>
            <Button size="small" onClick={() => onUse(template._id)} isLoading={isLoading}>
              Use template
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
