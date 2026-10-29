'use client';

import { useId, useState } from 'react';
import { Image as ImageIcon, Monitor, Palette, Plus, SlidersHorizontal, Smartphone, Tablet, Eye } from 'lucide-react';
import type { ButtonRadius, ButtonStyle, CoverPosition, FormBranding, FormSpacing } from '@/types/form';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { uploadService } from '@/services/upload';
import { brandButtonStyle, brandCoverObjectPosition, brandGapClass } from '@/lib/formTheme';
import { ImageUploadZone } from '@/components/form-builder/BrandingPanel';
import { uploadSrc } from '@/lib/uploadSrc';

// Workspace Settings > Branding, laid out as the reference design: Appearance, Branding (logo + cover) and Form
// behaviour on the left; a realistic Live preview with a device toggle on the right. Fully controlled — the tab
// owns the draft and the Save / Cancel bar. These are DEFAULTS for new forms; every form can still override them.
const PRESETS = ['#1D4ED8', '#0F172A', '#16A34A', '#DC2626', '#9333EA'];
const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICES: { id: Device; label: string; Icon: typeof Monitor; width: string }[] = [
  { id: 'desktop', label: 'Desktop preview', Icon: Monitor, width: '100%' },
  { id: 'tablet', label: 'Tablet preview', Icon: Tablet, width: '420px' },
  { id: 'mobile', label: 'Mobile preview', Icon: Smartphone, width: '300px' },
];

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-(--border-default) bg-(--surface-card) shadow-(--shadow-sm) p-5 flex flex-col gap-4">
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-(--accent-soft) text-(--accent-soft-text)" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h2 className="bg-h5 font-semibold text-(--text-primary)">{title}</h2>
          <p className="bg-body-sm text-(--text-muted)">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export interface WorkspaceBrandingEditorProps {
  branding: FormBranding;
  onChange: (updates: Partial<FormBranding>) => void;
}

export function WorkspaceBrandingEditor({ branding, onChange }: WorkspaceBrandingEditorProps) {
  const uid = useId();
  const { toast } = useToast();
  const color = branding.primaryColor ?? PRESETS[0];
  const [hex, setHex] = useState(color);
  const [prevColor, setPrevColor] = useState(color);
  const [hexError, setHexError] = useState(false);
  const [device, setDevice] = useState<Device>('desktop');

  // Re-sync the text box when the colour changes from elsewhere (a swatch, the picker, Cancel).
  if (color !== prevColor) {
    setPrevColor(color);
    setHex(color);
    setHexError(false);
  }

  const commitHex = () => {
    const v = hex.trim();
    if (HEX.test(v)) {
      setHexError(false);
      onChange({ primaryColor: v });
    } else {
      setHexError(true);
      setHex(color);
    }
  };

  const pickerValue = color.length === 4 ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` : color;

  const upload = async (file: File, key: 'logoUrl' | 'coverImageUrl') => {
    try {
      const res = await uploadService.uploadFile(file);
      onChange({ [key]: res.url });
    } catch {
      toast('Upload failed. Check your connection.', 'error');
    }
  };

  const showProgress = branding.showProgress !== false;
  const frameWidth = DEVICES.find((d) => d.id === device)?.width ?? '100%';

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 items-start">
      <div className="flex flex-col gap-4 min-w-0">
        <Section icon={<Palette size={18} />} title="Appearance" description="Customise the default appearance for all new forms in this workspace.">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="bg-label">Primary colour</p>
              <p className="bg-caption text-(--text-muted)">Used for buttons, links and highlights.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-9 w-9 shrink-0 rounded-md border border-(--border-default)" style={{ backgroundColor: color }} aria-hidden="true" />
              <input
                aria-label="Primary colour hex value"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                onBlur={commitHex}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                aria-invalid={hexError}
                className="w-32 rounded-md border-2 border-(--border-default) px-2.5 min-h-11 bg-body-sm font-mono bg-(--surface-card) outline-none focus:border-(--border-strong)"
              />
            </div>
          </div>
          {hexError && <p role="alert" className="bg-caption font-semibold text-(--error-text)">Enter a valid hex colour, e.g. #1D4ED8</p>}
          <div className="flex items-center gap-1 border-b border-(--border-subtle) pb-3">
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => onChange({ primaryColor: p })} aria-label={`Use ${p}`} aria-pressed={color.toLowerCase() === p.toLowerCase()} className="flex h-11 w-11 items-center justify-center rounded-full">
                <span aria-hidden="true" className={`h-7 w-7 rounded-full border-2 ${color.toLowerCase() === p.toLowerCase() ? 'border-(--border-strong) ring-2 ring-(--border-default)' : 'border-transparent'}`} style={{ backgroundColor: p }} />
              </button>
            ))}
            <label className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full" aria-label="Custom colour picker">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-(--border-strong)">
                <Plus size={12} className="text-(--text-disabled)" />
              </span>
              <input type="color" value={pickerValue} onChange={(e) => onChange({ primaryColor: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select id={`${uid}-bs`} label="Button style" value={branding.buttonStyle ?? 'solid'} onChange={(e) => onChange({ buttonStyle: e.target.value as ButtonStyle })}>
              <option value="solid">Solid</option>
              <option value="outline">Outline</option>
            </Select>
            <Select id={`${uid}-br`} label="Corner radius" value={branding.buttonRadius ?? '8px'} onChange={(e) => onChange({ buttonRadius: e.target.value as ButtonRadius })}>
              <option value="4px">Square (4px)</option>
              <option value="8px">Rounded (8px)</option>
              <option value="16px">Pill (16px)</option>
            </Select>
            <Select id={`${uid}-sp`} label="Form spacing" value={branding.spacing ?? 'comfortable'} onChange={(e) => onChange({ spacing: e.target.value as FormSpacing })}>
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </Select>
            <Select id={`${uid}-font`} label="Font" value="DM Sans" disabled onChange={() => undefined}>
              <option value="DM Sans">DM Sans</option>
            </Select>
          </div>
        </Section>

        <Section icon={<ImageIcon size={18} />} title="Branding" description="Set a logo and cover image for your forms.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <p className="bg-label">Workspace logo</p>
              <p className="bg-caption text-(--text-muted)">Square image, at least 256×256px. PNG or SVG with transparent background works best.</p>
              <ImageUploadZone label="Workspace logo" imageUrl={branding.logoUrl} aspect="square" compact hint="PNG, SVG (Max 1MB)" onUpload={(f) => upload(f, 'logoUrl')} onRemove={() => onChange({ logoUrl: undefined })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="bg-label">Cover image</p>
              <p className="bg-caption text-(--text-muted)">Shown at the top of shared pages. Recommended 1600×500px.</p>
              <ImageUploadZone label="Cover image" imageUrl={branding.coverImageUrl} aspect="banner" compact hint="PNG or JPG (Max 5MB)" onUpload={(f) => upload(f, 'coverImageUrl')} onRemove={() => onChange({ coverImageUrl: undefined })} />
            </div>
          </div>
        </Section>

        <Section icon={<SlidersHorizontal size={18} />} title="Form behaviour" description="Control additional defaults for new forms.">
          <div className="flex flex-col gap-4">
            <div className="max-w-sm">
              <Select id={`${uid}-cp`} label="Cover position" value={branding.coverPosition ?? 'center'} onChange={(e) => onChange({ coverPosition: e.target.value as CoverPosition })} disabled={!branding.coverImageUrl}>
                <option value="center">Center (default)</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </Select>
              {!branding.coverImageUrl && <p className="bg-caption text-(--text-muted) mt-1">Upload a cover image to choose where it is cropped.</p>}
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border border-(--border-default) px-4 py-3">
              <div className="min-w-0">
                <label htmlFor={`${uid}-pg`} className="bg-label">Show progress indicator</label>
                <p className="bg-caption text-(--text-muted)">The step bar on multi-page forms.</p>
              </div>
              <Switch id={`${uid}-pg`} checked={showProgress} onChange={(v) => onChange({ showProgress: v })} />
            </div>
          </div>
        </Section>
      </div>

      {/* Live preview — always the form's own LIGHT theme (CF2.11): the admin's dark mode must not change what respondents see. */}
      <section aria-label="Live preview" className="rounded-lg border border-(--border-default) bg-(--surface-card) shadow-(--shadow-sm) p-5 flex flex-col gap-4 xl:sticky xl:top-4">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-(--accent-soft) text-(--accent-soft-text)" aria-hidden="true">
              <Eye size={18} />
            </span>
            <div>
              <h2 className="bg-h5 font-semibold text-(--text-primary)">Live preview</h2>
              <p className="bg-body-sm text-(--text-muted)">See how a new form will look with your current settings.</p>
            </div>
          </div>
          <div role="group" aria-label="Preview device" className="flex gap-1">
            {DEVICES.map(({ id, label, Icon }) => (
              <button key={id} type="button" aria-label={label} aria-pressed={device === id} onClick={() => setDevice(id)} className={`flex h-11 w-11 items-center justify-center rounded-md border ${device === id ? 'border-(--border-focus) bg-(--accent-soft) text-(--accent-soft-text)' : 'border-(--border-default) text-(--text-muted) hover:bg-(--surface-hover)'}`}>
                <Icon size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </header>

        <div className="rounded-lg p-4 sm:p-6 flex justify-center" style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, #ffffff)` }}>
          <div className="w-full overflow-hidden rounded-xl shadow-(--shadow-md)" style={{ maxWidth: frameWidth, backgroundColor: '#FFFFFF', color: '#111827' }}>
            <div className="relative w-full h-28" style={{ backgroundColor: color }}>
              {branding.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL
                <img src={uploadSrc(branding.coverImageUrl)} alt="" className="h-full w-full object-cover" style={{ objectPosition: brandCoverObjectPosition(branding) }} />
              )}
            </div>
            <div className={`p-5 flex flex-col ${brandGapClass(branding)}`}>
              <div className="flex items-center gap-3">
                {branding.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL
                  <img src={uploadSrc(branding.logoUrl)} alt="" className="h-12 w-12 rounded-md object-cover" />
                ) : (
                  <span className="h-12 w-12 rounded-md border border-dashed" style={{ borderColor: '#D1D5DB', backgroundColor: '#F3F4F6' }} aria-hidden="true" />
                )}
                <div>
                  <p className="text-lg font-semibold">New Form</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>A short description for your form.</p>
                </div>
              </div>
              {showProgress && (
                <div aria-hidden="true">
                  <div className="flex justify-between text-[11px]" style={{ color: '#6B7280' }}>
                    <span>Step 1 of 2</span>
                    <span>50%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
                    <div className="h-full w-1/2 rounded-full" style={{ backgroundColor: color }} />
                  </div>
                </div>
              )}
              {['Your name', 'Email address'].map((label, i) => (
                <div key={label} aria-hidden="true">
                  <p className="text-sm font-semibold">{label}</p>
                  <div className="mt-1 flex h-10 items-center rounded-md border px-3 text-sm" style={{ borderColor: '#D1D5DB', backgroundColor: '#F9FAFB', color: '#9CA3AF' }}>
                    {i === 0 ? 'Enter your name' : 'you@example.com'}
                  </div>
                </div>
              ))}
              <div aria-hidden="true">
                <p className="text-sm font-semibold">Select option</p>
                <div className="mt-1 flex h-10 items-center justify-between rounded-md border px-3 text-sm" style={{ borderColor: '#D1D5DB', backgroundColor: '#FFFFFF' }}>
                  Choose an option <span style={{ color: '#6B7280' }}>⌄</span>
                </div>
              </div>
              <button type="button" disabled className="w-full min-h-11 text-sm font-semibold" style={brandButtonStyle(branding)}>
                Submit
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
