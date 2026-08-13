'use client';

import { FileSpreadsheet, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ReportFormat } from '@/types/report';

const FORMAT_ICON: Record<ReportFormat, typeof FileSpreadsheet> = {
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
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="text-body font-semibold text-neutral-900">{title}</h3>
          <p className="text-caption text-neutral-500">{description}</p>
        </div>
      </div>
      <Button variant="primary" onClick={onGenerate} isLoading={isLoading} disabled={disabled}>
        Generate
      </Button>
    </Card>
  );
}
