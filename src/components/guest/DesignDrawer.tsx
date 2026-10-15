'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { ImageUploadZone } from '@/components/form-builder/BrandingPanel';
import { useBuilderStore } from '@/store/builderStore';
import { useNarrow } from '@/hooks/useNarrow';
import { FORM_FONT_OPTIONS } from '@/lib/formTheme';
import { LAYOUT_LOOKS, LAYOUT_PRESETS, lookBranding, normaliseLayout } from '@/lib/layoutPresets';
import { putImage, type ImageKey } from '@/lib/guest/guestDraft';
import { trackFunnel } from '@/lib/guest/funnel';
import { cn } from '@/lib/utils';
import type { ButtonRadius, ButtonStyle, FormFont, LayoutPreset } from '@/types/form';

const PRESET_COLORS = ['#1D4ED8', '#0F172A', '#16A34A', '#DC2626', '#9333EA'];
const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

// Only commits a valid hex; anything else reverts on blur. Remounted (key) when the colour changes elsewhere.
function HexField({ value, onCommit }: { value: string; onCommit: (hex: string) => void }) {
  const [text, setText] = useState(value);
  const [bad, setBad] = useState(false);
  return (
    <Input
      id="guest-hex"
      label="Colour code"
      value={text}
      error={bad ? 'Use a hex colour, like #1D4ED8' : undefined}
      onChange={(e) => { setText(e.target.value); setBad(false); }}
      onBlur={() => {
        const v = text.trim();
        if (HEX.test(v)) onCommit(v);
        else { setBad(true); setText(value); }
      }}
    />
  );
}

function Group({ title, first, children }: { title: string; first?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn('flex flex-col gap-3', !first && 'border-t border-(--border-default) pt-5')}>
      <h3 className="bg-body font-semibold text-(--text-primary)">{title}</h3>
      {children}
    </section>
  );
}

// Everything a guest can change about how the form looks. Used in the right-hand panel on wide screens and in a
// bottom sheet on a phone. Every control writes the same branding/settings fields the full builder uses.
export function DesignControls({ onDone }: { onDone?: () => void }) {
  const { toast } = useToast();
  const branding = useBuilderStore((s) => s.branding);
  const settings = useBuilderStore((s) => s.settings);
  const { setBranding, setSettings } = useBuilderStore.getState();
  const current = normaliseLayout(settings.layout);
  const primary = branding.primaryColor ?? '#1D4ED8';

  const pick = (id: LayoutPreset) => {
    setSettings({ layout: id });
    setBranding(lookBranding(id, branding, true)); // a theme is layout + colour + font together
    trackFunnel('guest_look_chosen', { layout: id });
  };
  const upload = (key: ImageKey) => async (file: File) => {
    const r = await putImage(key, file);
    if ('error' in r) toast(r.error, 'error');
    else setBranding({ [key]: r.url, ...(key === 'coverImageUrl' ? { coverFit: branding.coverFit ?? 'original' } : {}) });
  };

  return (
    <div className="flex flex-col gap-5">
      <Group title="Theme" first>
        <div className="grid grid-cols-3 gap-2">
          {LAYOUT_PRESETS.map((p) => {
            const look = LAYOUT_LOOKS[p.id];
            const selected = current === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={selected}
                aria-label={`${p.name}: ${p.tagline}`}
                title={p.tagline}
                onClick={() => pick(p.id)}
                className={cn('flex flex-col items-center gap-1.5 rounded-lg border-2 p-2', selected ? 'border-(--border-focus)' : 'border-(--border-default) hover:border-(--border-strong)')}
              >
                <span className="flex h-9 w-full items-center justify-center rounded-md text-white" style={{ backgroundColor: look.color, fontFamily: FORM_FONT_OPTIONS.find((f) => f.value === look.font)?.stack }}>
                  {selected ? <Check size={16} aria-hidden="true" /> : <span className="font-bold">Aa</span>}
                </span>
                <span className="bg-caption font-medium text-(--text-primary)">{p.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Primary colour">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Preset colours">
          {PRESET_COLORS.map((c) => {
            const on = primary.toLowerCase() === c.toLowerCase();
            return (
              <button key={c} type="button" aria-label={`Use ${c}`} aria-pressed={on} onClick={() => setBranding({ primaryColor: c, backgroundColor: undefined })} className={cn('flex size-9 items-center justify-center rounded-full border-2 text-white', on ? 'border-(--text-primary)' : 'border-(--border-default)')} style={{ backgroundColor: c }}>
                {on && <Check size={14} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <HexField key={primary} value={primary} onCommit={(hex) => setBranding({ primaryColor: hex, backgroundColor: undefined })} />
      </Group>

      <Group title="Font">
        <Select id="guest-font" aria-label="Font" value={branding.fontFamily ?? 'dm_sans'} onChange={(e) => setBranding({ fontFamily: e.target.value as FormFont })}>
          {FORM_FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </Select>
      </Group>

      <Group title="Buttons">
        <div className="grid grid-cols-2 gap-3">
          <Select id="guest-btn-style" label="Style" value={branding.buttonStyle ?? 'solid'} onChange={(e) => setBranding({ buttonStyle: e.target.value as ButtonStyle })}>
            <option value="solid">Solid</option>
            <option value="outline">Outline</option>
          </Select>
          <Select id="guest-btn-radius" label="Corners" value={branding.buttonRadius ?? '8px'} onChange={(e) => setBranding({ buttonRadius: e.target.value as ButtonRadius })}>
            <option value="4px">Sharp</option>
            <option value="8px">Rounded</option>
            <option value="16px">Pill</option>
          </Select>
        </div>
      </Group>

      <Group title="Logo (optional)">
        <ImageUploadZone label="Logo" aspect="square" compact imageUrl={branding.logoUrl} onUpload={upload('logoUrl')} onRemove={() => setBranding({ logoUrl: undefined })} />
      </Group>

      <Group title="Cover image (optional)">
        <ImageUploadZone label="Cover image" aspect="banner" compact imageUrl={branding.coverImageUrl} onUpload={upload('coverImageUrl')} onRemove={() => setBranding({ coverImageUrl: undefined })} />
      </Group>

      {onDone && <Button onClick={onDone} className="self-start">Done</Button>}
    </div>
  );
}

// Below the wide layout the same controls open as a bottom sheet from the header's Design button.
export function DesignDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const narrow = useNarrow();
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Design" description="Choose how this form looks to people who fill it in." placement={narrow ? 'bottom' : 'right'}>
      <DesignControls onDone={onClose} />
    </Drawer>
  );
}
