'use client';

import type { Template } from '@/types/form';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';

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
        <StatusBadge variant="neutral" className="capitalize shrink-0">
          {template.category}
        </StatusBadge>
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
