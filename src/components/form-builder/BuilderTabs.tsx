'use client';

import { Undo2, Redo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

// Share & Embed is the fourth tab, after Settings (CF2.1). It is hidden for roles that cannot see it.
export type BuilderTab = 'build' | 'branding' | 'settings' | 'share';

interface BuilderTabsProps {
  activeTab: BuilderTab;
  onChange: (tab: BuilderTab) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Whether the Share tab is shown (Reviewers do not see it). */
  showShare?: boolean;
  /** Non-deleted field count; shown on the Build tab when above zero. */
  fieldCount?: number;
  /** Hide the Behaviour tab: the form's top-level Settings tab already covers it. */
  hideSettings?: boolean;
}

const TABS: { id: BuilderTab; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'branding', label: 'Branding' },
  { id: 'settings', label: 'Behaviour' },
  { id: 'share', label: 'Share' },
];

export function BuilderTabs({ activeTab, onChange, canUndo, canRedo, onUndo, onRedo, showShare = true, fieldCount = 0, hideSettings = false }: BuilderTabsProps) {
  return (
    <nav className="flex shrink-0 items-center justify-between border-b border-(--border-default)" aria-label="Form Builder Tabs">
      {/* Real role="tablist"/role="tab"/aria-selected semantics — confirmed missing during Sprint
          6 (SettingsTabs.tsx was built with its own correct semantics rather than copied from
          here, since this component lacked them), fixed here per that sprint's Friday
          accessibility-pass task. */}
      <div className="flex min-w-0 items-center overflow-x-auto" role="tablist" aria-label="Form Builder sections">
        {TABS.filter((t) => (showShare || t.id !== 'share') && !(hideSettings && t.id === 'settings')).map((tab) => {
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
