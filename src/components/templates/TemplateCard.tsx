'use client';

import type { Template } from '@/types/form';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface TemplateCardProps {
  template: Template;
  onUse: (id: string) => void;
  isLoading: boolean;
}

export function TemplateCard({ template, onUse, isLoading }: TemplateCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-heading-2 text-neutral-800">{template.name}</h3>
        <span className="text-caption font-medium text-neutral-600 bg-neutral-100 rounded px-2 py-1 shrink-0 capitalize">
          {template.category}
        </span>
      </div>
      <p className="text-body text-neutral-500 flex-1">{template.description}</p>
      <span className="text-caption text-neutral-500">
        {template.fields.length} {template.fields.length === 1 ? 'field' : 'fields'}
      </span>
      <Button onClick={() => onUse(template._id)} isLoading={isLoading} className="w-full">
        Use template
      </Button>
    </Card>
  );
}
