'use client';

import { useRef, useState } from 'react';

import { createPortal } from 'react-dom';
import { ArrowRight, Info, X, Zap } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { DeviceToggle, type PreviewDevice } from '@/components/preview/DeviceToggle';
import { PreviewFrame } from '@/components/preview/PreviewFrame';
import { LAYOUT_PRESETS, layoutRecommendation, normaliseLayout, type LayoutPresetInfo } from '@/lib/layoutPresets';
import type { LayoutPreset } from '@/types/form';
import { LayoutPresetCard } from './LayoutPresetCard';

// Sprint 13 (CF2.7), requirements.md 2.1 — Wireframe "Branding · step 1 of 2: Choose a layout".
// This is the INLINE first step of the Branding tab (not a modal): heading with eyebrow, a dashed
// "Skip — customise manually" button, a field-count nudge, then the six cards. Only Preview opens a
// dialog: the real public form in a same-origin iframe (`?layout=` override) at Desktop / Tablet /
// Mobile, with the Mobile behaviour / Accessibility / Watch out notes, and "Back to layouts" /
// "Use {name}". Choosing a preset only sets `settings.layout` — it never touches fields.
export interface LayoutGalleryProps {
  formId?: string;
  /** Current stored layout value (any legacy or new value — normalised here). */
  currentLayout?: string;
  fieldCount: number;
  /** True when the form is live under a public access mode — Compact is "not for public forms". */
  isPublic: boolean;
  onUse: (layout: LayoutPreset) => void;
  /** "Skip — customise manually": go straight to step 2 (Branding controls). */
  onSkip: () => void;
}

export function LayoutGallery({ formId, currentLayout, fieldCount, isPublic, onUse, onSkip }: LayoutGalleryProps) {
  const [previewing, setPreviewing] = useState<LayoutPresetInfo | null>(null);
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const current = normaliseLayout(currentLayout);
  const nudge = layoutRecommendation(fieldCount);
  const recommendedId: LayoutPreset | null = fieldCount === 0 ? null : fieldCount <= 5 ? 'classic' : 'steps';

  const use = (preset: LayoutPreset) => {
    onUse(preset);
    setPreviewing(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-prose">
          <span className="bg-caption font-semibold uppercase tracking-wide text-(--text-muted)">Step 1 of 2</span>
          <h2 className="bg-h4 font-bold text-(--text-primary)">Choose a layout</h2>
          <p className="bg-body text-(--text-muted) mt-1">
            Pick a starting point instead of building the look by hand. You can fine-tune colours, fonts and spacing
            straight after, and change layout at any time without losing your fields.
          </p>
        </div>
        {/* Step 2 is desktop-only (CF2.12a), so there is nothing to skip to below 1024px. */}
        <Button type="button" variant="secondary" onClick={onSkip} className="hidden min-h-11 gap-2 lg:inline-flex">
          Skip — customise manually
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>

      {nudge && (
        <div className="grid gap-4 rounded-xl border border-(--info-border) bg-(--info-surface) p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--surface-card) text-(--action-primary)">
              <Info size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="bg-body font-semibold text-(--text-primary)">
                Your form currently has {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
              </p>
              <p className="bg-body-sm text-(--text-secondary)">{nudge}</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 border-l border-(--info-border) pl-4 md:flex">
            <Zap size={18} className="shrink-0 text-(--action-primary)" aria-hidden="true" />
            <div>
              <p className="bg-body-sm font-semibold text-(--text-primary)">Not sure?</p>
              <p className="bg-caption text-(--text-muted)">You can always change the layout later without losing any data.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LAYOUT_PRESETS.map((preset) => (
          <LayoutPresetCard
            key={preset.id}
            preset={preset}
            selected={preset.id === current}
            recommended={preset.id === recommendedId}
            canPreview={!!formId}
            onPreview={() => setPreviewing(preset)}
            onUse={() => use(preset.id)}
          />
        ))}
      </div>

      {previewing && (
        <FullScreenPreview
          preset={previewing}
          formId={formId}
          device={device}
          onDeviceChange={setDevice}
          current={current}
          isPublic={isPublic}
          onClose={() => setPreviewing(null)}
          onUse={() => use(previewing.id)}
        />
      )}
    </div>
  );
}

// Full-screen preview (not a dialog): the form needs real width to be judged — a Desktop/Tablet/Mobile
// toggle in a 700px modal squeezes the 1024px frame into a thumbnail. Header (name, tagline, device
// toggle, close) · stage (the iframe fills all remaining height) · notes + actions pinned below.
function FullScreenPreview({
  preset,
  formId,
  device,
  onDeviceChange,
  current,
  isPublic,
  onClose,
  onUse,
}: {
  preset: LayoutPresetInfo;
  formId?: string;
  device: PreviewDevice;
  onDeviceChange: (d: PreviewDevice) => void;
  current: LayoutPreset;
  isPublic: boolean;
  onClose: () => void;
  onUse: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(true, onClose, ref);
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="layout-preview-title"
      className="fixed inset-0 z-90 flex flex-col bg-(--bg-subtle)"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-(--surface-card) px-4 py-2 shrink-0">
        <div className="min-w-0">
          <h2 id="layout-preview-title" className="bg-h5 font-bold text-(--text-primary)">
            {preset.name}
          </h2>
          <p className="bg-body-sm text-(--text-muted) truncate">
            {preset.tagline} • best for {preset.best}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <DeviceToggle device={device} onChange={onDeviceChange} />
          </div>
          <Button type="button" variant="ghost" size="small" onClick={onClose} aria-label="Close preview" className="min-h-11 min-w-11">
            <X size={18} />
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex justify-center px-2 pt-2 pb-1 md:px-4 md:pt-3">
        <PreviewFrame formId={formId ?? ''} device={device} layout={preset.id} title={`${preset.name} layout preview`} />
      </div>

      <footer className="shrink-0 border-t bg-(--surface-card) px-4 py-2.5 flex flex-col gap-2">
        <dl className="hidden lg:grid grid-cols-3 gap-6">
          {[
            ['Mobile behaviour', preset.mobile],
            ['Accessibility', preset.a11y],
            ['Watch out', preset.watch],
          ].map(([label, text]) => (
            <div key={label}>
              <dt className="bg-caption font-semibold uppercase tracking-wide text-(--text-muted)">{label}</dt>
              <dd className="bg-body-sm text-(--text-secondary) mt-0.5">{text}</dd>
            </div>
          ))}
        </dl>
        {preset.internalOnly && isPublic && (
          <Alert variant="warning" title="Compact is for internal forms">
            {preset.watch}
          </Alert>
        )}
        <div className="flex items-center justify-between gap-3 sm:justify-between max-sm:justify-end">
          <p className="hidden sm:block bg-caption text-(--text-muted)">Preview uses your last saved version of the form.</p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Back to layouts
            </Button>
            <Button type="button" onClick={onUse} disabled={preset.id === current}>
              Use {preset.name}
            </Button>
          </div>
        </div>
      </footer>
    </div>,
    document.body
  );
}
