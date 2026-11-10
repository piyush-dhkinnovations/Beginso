'use client';

import { Eye, FileText, MoreVertical, Plus } from 'lucide-react';
import type { Template } from '@/types/form';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { TemplateThumb } from '@/components/templates/TemplateThumb';
import { bx } from '@/lib/utils';

export interface TemplateCardProps {
  template: Template;
  onUse: (id: string) => void;
  onPreview: (template: Template) => void;
  isLoading: boolean;
  /** Horizontal, two-column "featured" layout — used for a lone last card so the grid has no hole. */
  wide?: boolean;
}

export function TemplateCard({ template, onUse, onPreview, isLoading, wide }: TemplateCardProps) {
  const count = template.fields.length;

  return (
    <Card padded={false} className={bx('overflow-hidden', wide && 'sm:col-span-2 sm:flex-row')}>
      <div className={bx(wide && 'shrink-0 sm:w-80')}>
        <TemplateThumb template={template} />
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
