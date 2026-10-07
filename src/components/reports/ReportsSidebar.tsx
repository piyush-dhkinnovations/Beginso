import Link from 'next/link';
import { ArrowRight, BarChart3, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/Card';

// Tips that describe how Reports actually behaves today (background generation, polling, expiry,
// the CSV/PDF split) — deliberately no invented limits.
const TIPS = [
  'Reports are generated in the background — you can leave this page and come back.',
  'PDF reports are print-ready summaries; share them as they are.',
  'CSV files open in Excel or Google Sheets for further analysis.',
  'Generated files expire, so download the ones you need soon.',
];

// Right-hand column of the Exports page: a nudge to Insights and a short list of tips.
export function ReportsSidebar({ scope = 'personal' }: { scope?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-3">
        <span aria-hidden="true" className="bg-stat-icon mb-0 h-7! w-7!"><BarChart3 /></span>
        <h2 className="bg-h5 font-bold text-(--text-primary)">Need more insights?</h2>
        <p className="bg-body-sm text-(--text-muted)">Use Insights to understand your responses better with detailed charts and metrics.</p>
        <Link href={scope === 'personal' ? '/insights' : `/w/${scope}/insights`} className="bg-btn bg-btn-secondary w-full">
          Go to Insights
          <ArrowRight size={16} className="ml-2" aria-hidden="true" />
        </Link>
      </Card>

      <Card className="gap-3">
        <h2 className="flex items-center gap-2 bg-body font-semibold text-(--text-primary)">
          <Lightbulb size={18} className="text-(--action-primary)" aria-hidden="true" />
          Quick Tips
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 bg-body-sm text-(--text-secondary) marker:text-(--text-disabled)">
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
