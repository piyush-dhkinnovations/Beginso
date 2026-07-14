'use client';

import { cn } from '@/lib/utils';

export type BuilderTab = 'build' | 'logic' | 'branding' | 'settings' | 'share';

interface BuilderTabsProps {
  activeTab: BuilderTab;
  onChange: (tab: BuilderTab) => void;
}

const TABS: { id: BuilderTab; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'logic', label: 'Logic' },
  { id: 'branding', label: 'Branding' },
  { id: 'settings', label: 'Settings' },
  { id: 'share', label: 'Share' },
];

export function BuilderTabs({ activeTab, onChange }: BuilderTabsProps) {
  return (
    <nav className="flex flex-wrap border-b bg-white shrink-0 shadow-sm" aria-label="Form Builder Tabs">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
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
        );
      })}
    </nav>
  );
}
