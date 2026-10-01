'use client';

import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ReportFormat } from '@/types/report';

export const FORMAT_ICON: Record<ReportFormat, typeof FileSpreadsheet> = {
  csv: FileSpreadsheet,
  pdf: FileText,
};

// Colour per format — success (green) for the spreadsheet, error (red) for the PDF — as tokens
// mixed into the surface, so they follow every theme.
const FORMAT_TONE: Record<ReportFormat, { ink: string; label: string }> = {
  csv: { ink: 'var(--success)', label: 'CSV' },
  pdf: { ink: 'var(--error)', label: 'PDF' },
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
  const tone = FORMAT_TONE[format];

  return (
    <Card className="flex-row flex-wrap items-center gap-x-5 gap-y-4 p-5!">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl"
        style={{ backgroundColor: `color-mix(in srgb, ${tone.ink} 14%, var(--surface-card))`, color: tone.ink }}
      >
        <Icon size={24} strokeWidth={1.7} />
        <span className="text-[10px] font-bold leading-none tracking-wide">{tone.label}</span>
      </span>
      <div className="min-w-48 flex-1">
        <h3 className="bg-body font-semibold text-(--text-primary)">{title}</h3>
        <p className="bg-body-sm text-(--text-muted)">{description}</p>
      </div>
      <Button variant="primary" onClick={onGenerate} isLoading={isLoading} disabled={disabled}>
        <Download size={16} className="mr-2" aria-hidden="true" />
        Generate {tone.label}
      </Button>
    </Card>
  );
}
