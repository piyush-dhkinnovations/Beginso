'use client';

import type { LayoutLook } from '@/lib/layoutPresets';
import { brandPanelStyle } from '@/lib/formTheme';
import type { LayoutPreset } from '@/types/form';

// Static schematic per preset, drawn from tokens — cards never mount the real form; only an explicit
// Preview does. Each is a small white "form" sheet on a tinted stage, like the reference gallery.
const FIELD = 'h-3 rounded-sm bg-(--bg-sunken) border border-(--border-subtle)';
const LABEL = 'h-1 w-1/3 rounded-full bg-(--border-strong)';
const BTN = 'h-3.5 rounded-sm bg-(--action-primary)';

// Each preset draws its own card surface (flat / soft / bordered / elevated), so the six thumbnails are not one white box.
const SURFACE: Record<LayoutLook['cardStyle'], string> = {
  flat: 'rounded-sm',
  soft: 'rounded-md shadow-(--shadow-md)',
  bordered: 'rounded-md border-2 border-(--border-default)',
  elevated: 'rounded-xl shadow-xl',
};

function Sheet({ children, className = '', surface }: { children: React.ReactNode; className?: string; surface: string }) {
  return <div className={`bg-(--surface-card) ${surface} p-3 flex flex-col gap-2 ${className}`}>{children}</div>;
}

export function Schematic({ id, look }: { id: LayoutPreset; look: LayoutLook }) {
  const surface = SURFACE[look.cardStyle];
  const panel = brandPanelStyle({ primaryColor: look.color, panelTreatment: look.panel });
  switch (id) {
    case 'card_stack':
      return (
        <Sheet surface={surface} className="w-3/5">
          <div className="h-1.5 w-1/2 rounded-full bg-(--border-strong)" />
          <div className="rounded-sm border border-(--border-subtle) p-1.5 flex flex-col gap-1.5">
            <div className={FIELD} />
            <div className={FIELD} />
          </div>
          <div className="rounded-sm border border-(--border-subtle) p-1.5 flex flex-col gap-1.5">
            <div className={FIELD} />
          </div>
          <div className={`${BTN} w-1/4 self-end`} />
        </Sheet>
      );
    case 'guided':
      return (
        <Sheet surface={surface} className="w-3/5">
          <div className="h-1 w-full rounded-full bg-(--bg-sunken)"><div className="h-1 w-1/4 rounded-full bg-(--action-primary)" /></div>
          <div className="h-2 w-3/4 rounded-sm bg-(--border-strong)" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="size-2 rounded-full border border-(--border-strong)" />
              <div className="h-1 w-1/3 rounded-full bg-(--border-default)" />
            </div>
          ))}
          <div className={`${BTN} w-1/4 self-end`} />
        </Sheet>
      );
    case 'steps':
      return (
        <div className={`flex w-4/5 overflow-hidden bg-(--surface-card) ${surface}`}>
          <div className="w-2/5 bg-(--bg-subtle) p-3 flex flex-col gap-2.5">
            {[true, false, false].map((on, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`size-2.5 shrink-0 rounded-full border-2 ${on ? 'border-(--action-primary) bg-(--action-primary)' : 'border-(--border-strong)'}`} />
                <div className="h-1 flex-1 rounded-full bg-(--border-default)" />
              </div>
            ))}
          </div>
          <div className="flex-1 p-3 flex flex-col gap-2">
            <div className="h-1.5 w-1/2 rounded-full bg-(--border-strong)" />
            <div className={FIELD} />
            <div className={FIELD} />
            <div className={`${BTN} w-1/3 self-end`} />
          </div>
        </div>
      );
    case 'split_feature':
      return (
        <div className={`flex w-4/5 h-[88%] overflow-hidden bg-(--surface-card) ${surface}`}>
          <div className="w-2/5 p-3 flex flex-col justify-end gap-1.5" style={panel}>
            <div className="h-1.5 w-2/3 rounded-full bg-white/80" />
            <div className="h-1 w-1/2 rounded-full bg-white/50" />
          </div>
          <div className="flex-1 p-3 flex flex-col justify-center gap-2">
            <div className="h-1.5 w-1/2 rounded-full bg-(--border-strong)" />
            <div className={FIELD} />
            <div className={FIELD} />
            <div className={BTN} />
          </div>
        </div>
      );
    case 'compact':
      return (
        <Sheet surface={surface} className="w-4/5">
          <div className="h-1.5 w-1/3 rounded-full bg-(--border-strong)" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="grid grid-cols-2 gap-1.5">
              <div className={FIELD} />
              <div className={FIELD} />
            </div>
          ))}
          <div className={`${BTN} w-1/4 self-end`} />
        </Sheet>
      );
    default:
      return (
        <Sheet surface={surface} className="w-3/5">
          <div className="h-1.5 w-1/2 rounded-full bg-(--border-strong)" />
          <div className={LABEL} />
          <div className={FIELD} />
          <div className={LABEL} />
          <div className={FIELD} />
          <div className={BTN} />
        </Sheet>
      );
  }
}
