'use client';

import { Eye, FileText, MoreVertical, Plus } from 'lucide-react';
import type { Template } from '@/types/form';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { TemplateThumb } from '@/components/templates/TemplateThumb';
import { bx } from '@/lib/utils';

// One tint per category, drawn from semantic tokens so it follows every theme. Unknown
// categories (the backend's list is open-ended) fall back to a neutral tint.
const TINTS: Record<string, { surface: string; ink: string }> = {
  advanced: { surface: 'var(--accent-soft)', ink: 'var(--accent-soft-text)' },
  general: { surface: 'var(--success-surface)', ink: 'var(--success-text)' },
  feedback: { surface: 'var(--info-surface)', ink: 'var(--info-text)' },
  hr: { surface: 'var(--warning-surface)', ink: 'var(--warning-text)' },
  events: { surface: 'var(--accent-soft)', ink: 'var(--accent-soft-text)' },
  sales: { surface: 'var(--bg-sunken)', ink: 'var(--text-secondary)' },
};
const FALLBACK_TINT = { surface: 'var(--bg-sunken)', ink: 'var(--text-secondary)' };

export const categoryTint = (category: string) => TINTS[category.toLowerCase()] ?? FALLBACK_TINT;

export interface TemplateCardProps {
  template: Template;
  onUse: (id: string) => void;
  onPreview: (template: Template) => void;
  isLoading: boolean;
  /** Horizontal, two-column "featured" layout — used for a lone last card so the grid has no hole. */
  wide?: boolean;
}

export function TemplateCard({ template, onUse, onPreview, isLoading, wide }: TemplateCardProps) {
  const tint = categoryTint(template.category);
  const count = template.fields.length;

  return (
    <Card padded={false} className={bx('overflow-hidden', wide && 'sm:col-span-2 sm:flex-row')}>
      <div
        className={bx('relative flex items-center justify-center', wide ? 'shrink-0 py-8 sm:w-80' : 'h-44')}
        style={{ background: `linear-gradient(135deg, ${tint.surface}, var(--bg-subtle))` }}
      >
        <span
          className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full bg-(--surface-card) px-2.5 py-0.5 bg-caption font-semibold capitalize"
          style={{ color: tint.ink }}
        >
          {template.category}
        </span>
        <TemplateThumb template={template} ink={tint.ink} surface={tint.surface} />
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
