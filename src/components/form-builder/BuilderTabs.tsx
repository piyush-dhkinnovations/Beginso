'use client';

import { ChevronRight, Undo2, Redo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export type BuilderTab = 'build' | 'branding' | 'settings' | 'share';

interface BuilderTabsProps {
  activeTab: BuilderTab;
  onChange: (tab: BuilderTab) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const TABS: { id: BuilderTab; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'branding', label: 'Branding' },
  { id: 'settings', label: 'Settings' },
  { id: 'share', label: 'Share' },
];

export function BuilderTabs({ activeTab, onChange, canUndo, canRedo, onUndo, onRedo }: BuilderTabsProps) {
  return (
    <nav className="flex items-center justify-between border-b bg-white shrink-0 shadow-sm" aria-label="Form Builder Tabs">
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
                  'px-6 py-3 text-body font-semibold transition-all border-b-2 focus:outline-none min-h-[44px] min-w-[60px]',
                  isActive
                    ? 'border-brand-700 text-brand-700'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-200'
                )}
              >
                {tab.label}
              </button>
              {index < TABS.length - 1 && (
                <ChevronRight size={14} className="text-neutral-300 shrink-0" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1 pr-3 shrink-0">
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
