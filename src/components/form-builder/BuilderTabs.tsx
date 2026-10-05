'use client';

import Link from 'next/link';
import { ArrowUpRight, ChevronRight, Undo2, Redo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

// Sprint 13 (CF6.1): the Share tab is gone — distribution lives on /forms/[id]/share (wireframe 34).
export type BuilderTab = 'build' | 'branding' | 'settings';

interface BuilderTabsProps {
  activeTab: BuilderTab;
  onChange: (tab: BuilderTab) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Link-out to the Share & Embed page (wireframe: "Share & Embed ↗"). Omitted for roles that cannot see it. */
  shareHref?: string;
}

const TABS: { id: BuilderTab; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'branding', label: 'Branding' },
  { id: 'settings', label: 'Settings' },
];

export function BuilderTabs({ activeTab, onChange, canUndo, canRedo, onUndo, onRedo, shareHref }: BuilderTabsProps) {
  return (
    <nav className="flex items-center justify-between border-b bg-(--surface-card) shrink-0 shadow-(--shadow-sm)" aria-label="Form Builder Tabs">
      {/* Real role="tablist"/role="tab"/aria-selected semantics — confirmed missing during Sprint
          6 (SettingsTabs.tsx was built with its own correct semantics rather than copied from
          here, since this component lacked them), fixed here per that sprint's Friday
          accessibility-pass task. */}
      <div className="flex flex-wrap items-center" role="tablist" aria-label="Form Builder sections">
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <div key={tab.id} className="flex items-center">
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.id)}
                className={cn(
                  'px-3 md:px-6 py-3 bg-body font-semibold transition-all border-b-2 focus:outline-none min-h-11 min-w-15',
                  isActive
                    ? 'border-(--action-primary-hover) text-(--accent-soft-text)'
                    : 'border-transparent text-(--text-muted) hover:text-(--text-primary) hover:border-(--border-default)'
                )}
              >
                {tab.label}
              </button>
              {index < TABS.length - 1 && (
                <ChevronRight size={14} className="text-(--text-disabled) shrink-0" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1 pr-3 shrink-0">
        {shareHref && (
          <Link
            href={shareHref}
            className="flex min-h-11 items-center gap-1 px-2 bg-body-sm font-semibold text-(--text-muted) hover:text-(--text-primary)"
          >
            Share &amp; Embed <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
        )}
        <Button
          onClick={onUndo}
          disabled={!canUndo}
          variant="ghost"
          size="small"
          className="min-h-11 min-w-11 p-2"
          title="Undo"
        >
          <Undo2 size={16} />
        </Button>
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          variant="ghost"
          size="small"
          className="min-h-11 min-w-11 p-2"
          title="Redo"
        >
          <Redo2 size={16} />
        </Button>
      </div>
    </nav>
  );
}
