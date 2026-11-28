'use client';

import { Check, Redo2, Save, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { BUILDER_SAVE_SLOT_ID } from '@/lib/formHeaderSlot';

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
  /** The Save button, shown before Undo when given. */
  onSave?: () => void;
  unsaved?: boolean;
  saving?: boolean;
  /** Auto save is on: the Save button is there for whoever wants it, without asking to be pressed. */
  autoSave?: boolean;
  /** Saving is not possible (the form was changed elsewhere and must be reloaded). */
  saveBlocked?: boolean;
}

export function BuilderTabs({ activeTab, onChange, canUndo, canRedo, onUndo, onRedo, fieldCount = 0, onSave, unsaved = false, saving = false, saveBlocked = false, autoSave = false }: BuilderTabsProps) {
  const tabs: { id: BuilderTab; label: string }[] = [
    { id: 'build', label: 'Build' },
    { id: 'branding', label: 'Branding' },
    { id: 'settings', label: 'Settings' },
  ];
  return (
    // From 1024px it is the strip under the top bar. It stays there while the page scrolls, so Save is always in reach.
    <nav
      className={cn(
        'sticky top-13 z-10 flex shrink-0 items-center justify-between border-b border-(--border-default) bg-(--bg-page) lg:h-12 lg:items-stretch lg:bg-(--surface-card) lg:pl-3'
      )}
      aria-label="Form Builder Tabs"
    >
      {/* Real role="tablist"/role="tab"/aria-selected semantics. */}
      <div className="flex min-w-0 items-center overflow-x-auto lg:items-stretch" role="tablist" aria-label="Form Builder sections">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <div key={tab.id} className="flex items-center lg:items-stretch">
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.id)}
                className={cn(
                  'px-1.5 sm:px-3 md:px-6 py-3 lg:py-0 bg-body font-semibold whitespace-nowrap transition-all border-b-2 focus:outline-none min-h-11 min-w-15',
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

      {/* From 1024px the builder header shows its save state here, between the tabs and undo/redo. */}
      <div id={BUILDER_SAVE_SLOT_ID} className="hidden min-w-0 flex-1 items-center justify-center px-3 lg:flex" />

      <div className="flex items-center self-center shrink-0 sm:gap-1 sm:pr-3">
        {onSave && (
          <>
            <Button
              onClick={onSave}
              variant={!unsaved ? 'ghost' : autoSave ? 'secondary' : 'primary'}
              size="small"
              disabled={!unsaved || saveBlocked}
              isLoading={saving}
              className="min-h-11 min-w-10 gap-1.5 max-sm:px-2 sm:min-h-9 sm:min-w-11 sm:px-4"
              title={unsaved ? 'Save (Ctrl+S)' : 'Everything is saved'}
              aria-label={unsaved ? 'Save' : 'Saved'}
            >
              {!saving && (unsaved ? <Save size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />)}
              {/* A phone has room for the icon only. */}
              <span className="hidden sm:inline">{saving ? 'Saving…' : unsaved ? 'Save' : 'Saved'}</span>
            </Button>
            <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-(--border-default) sm:block" />
          </>
        )}
        <Button
          onClick={onUndo}
          disabled={!canUndo}
          variant="ghost"
          size="small"
          className="min-h-11 min-w-9 p-2 sm:min-w-11"
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
          className="min-h-11 min-w-9 p-2 sm:min-w-11"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </Button>
      </div>
    </nav>
  );
}
