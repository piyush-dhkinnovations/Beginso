'use client';

import { FileSpreadsheet, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ReportFormat } from '@/types/report';

export const FORMAT_ICON: Record<ReportFormat, typeof FileSpreadsheet> = {
  csv: FileSpreadsheet,
  pdf: FileText,
};

interface ReportFormatCardProps {
  format: ReportFormat;
  title: string;
  description: string;
  onGenerate: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ReportFormatCard({ format, title, description, onGenerate, isLoading, disabled = false }: ReportFormatCardProps) {
  const Icon = FORMAT_ICON[format];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--accent-soft) text-(--accent-soft-text)">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="bg-body font-semibold text-(--text-primary)">{title}</h3>
          <p className="bg-caption text-(--text-muted)">{description}</p>
        </div>
      </div>
      <Button variant="primary" onClick={onGenerate} isLoading={isLoading} disabled={disabled}>
        Generate
      </Button>
    </Card>
  );
}
