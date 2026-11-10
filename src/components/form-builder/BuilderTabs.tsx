'use client';

import { Undo2, Redo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

// Settings and Share are one tab, named Settings: the form's settings first, Share & Embed below them.
export type BuilderTab = 'build' | 'branding' | 'settings';
/** Where a caller can send the editor: a tab, or 'share' — the Settings tab scrolled down to its Share & Embed section. */
export type BuilderTarget = BuilderTab | 'share';

interface BuilderTabsProps {
  activeTab: BuilderTab;
  onChange: (tab: BuilderTab) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Unused by the tab bar itself (the tab is always named Settings) — kept so callers that still pass it don't break. */
  showShare?: boolean;
  /** Non-deleted field count; shown on the Build tab when above zero. */
  fieldCount?: number;
}

export function BuilderTabs({ activeTab, onChange, canUndo, canRedo, onUndo, onRedo, fieldCount = 0 }: BuilderTabsProps) {
  const tabs: { id: BuilderTab; label: string }[] = [
    { id: 'build', label: 'Build' },
    { id: 'branding', label: 'Branding' },
    { id: 'settings', label: 'Settings' },
  ];
  return (
    <nav className="flex shrink-0 items-center justify-between border-b border-(--border-default)" aria-label="Form Builder Tabs">
      {/* Real role="tablist"/role="tab"/aria-selected semantics — confirmed missing during Sprint
          6 (SettingsTabs.tsx was built with its own correct semantics rather than copied from
          here, since this component lacked them), fixed here per that sprint's Friday
          accessibility-pass task. */}
      <div className="flex min-w-0 items-center overflow-x-auto" role="tablist" aria-label="Form Builder sections">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <div key={tab.id} className="flex items-center">
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.id)}
                className={cn(
                  'px-3 md:px-6 py-3 bg-body font-semibold whitespace-nowrap transition-all border-b-2 focus:outline-none min-h-11 min-w-15',
                  isActive
                    ? 'border-(--action-primary-hover) text-(--accent-soft-text)'
                    : 'border-transparent text-(--text-muted) hover:text-(--text-primary) hover:border-(--border-default)'
                )}
              >
                {tab.label}
                {tab.id === 'build' && fieldCount > 0 && <span className="ml-1.5 font-normal text-(--text-muted)">{fieldCount}</span>}
              </button>
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
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </Button>
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          variant="ghost"
          size="small"
          className="min-h-11 min-w-11 p-2"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </Button>
      </div>
    </nav>
  );
}
