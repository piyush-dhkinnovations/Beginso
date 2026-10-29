'use client';

import { isAxiosError } from 'axios';
import { useId, useState, type ReactNode } from 'react';
import { Check, ImageIcon, Maximize2, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { safeHttpUrl } from '@/lib/fieldDisplay';
import { Switch } from '@/components/ui/Switch';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { Segmented } from '@/components/ui/Segmented';
import type { PreviewDevice } from '@/components/preview/DeviceToggle';
import { FORM_FONT_OPTIONS, PAGE_BACKGROUND_OPTIONS, brandWashStyle } from '@/lib/formTheme';
import { lookBranding } from '@/lib/layoutPresets';
import { uploadService } from '@/services/upload';
import { bx } from '@/lib/utils';
import type { BannerLink, ButtonRadius, ButtonStyle, CardStyle, CoverFit, CoverPosition, FieldGrouping, FormBranding, FormFont, FormSpacing, FormWidth, LayoutPreset, PageBackground, PanelTreatment, TypeScale } from '@/types/form';
import { ImageUploadZone } from './BrandingPanel';
import { LayoutChooser } from './LayoutChooser';
import { ZOOM_STEPS } from '@/lib/previewZoom';
import { LiveFormPreview } from './LiveFormPreview';

const PRESET_COLORS = ['#1D4ED8', '#0F172A', '#16A34A', '#DC2626', '#9333EA'];
const DEFAULT_COLOR = '#1D4ED8';
const MAX_LINKS = 5;
const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

type Section = 'layout' | 'colour' | 'text' | 'style' | 'header';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'layout', label: 'Layout' },
  { id: 'colour', label: 'Colour' },
  { id: 'text', label: 'Text' },
  { id: 'style', label: 'Style' },
  { id: 'header', label: 'Header' },
];

const COLUMNS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const;

/** The short name under each page background tile (the full name is its label). */
const BACKGROUND_NAME: Record<string, string> = { wash: 'Glow', plain: 'Plain', solid: 'Solid', gradient: 'Gradient', mesh: 'Mesh', dots: 'Dots', grid: 'Grid', image: 'Image' };

/** A few set choices, one click each: a row of buttons, the chosen one marked. Faster to use (and to see) than a drop-down. */
function ChipChoice<T extends string>({ label, value, options, onChange, columns = 3 }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; columns?: 2 | 3 | 4 }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <span id={id} className="bg-label">
        {label}
      </span>
      <div className={bx('grid gap-2', COLUMNS[columns])}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={bx(
              'min-h-10 rounded-lg border-2 px-2 bg-body-sm font-medium focus-visible:outline-2 focus-visible:outline-(--border-focus)',
              value === o.value ? 'border-(--action-primary) bg-(--accent-soft) text-(--text-primary)' : 'border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover)',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Five ready colours and a picker for any other. */
function Swatches({ value, onPick, name }: { value: string; onPick: (color: string) => void; name: string }) {
  // The native colour input wants six digits (#rrggbb)
  const six = value.length === 4 ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}` : value;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {PRESET_COLORS.map((color) => (
        <button key={color} type="button" onClick={() => onPick(color)} aria-label={`Use ${color}${name ? ` as the ${name}` : ''}`} aria-pressed={value.toLowerCase() === color.toLowerCase()} className="flex size-10 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-(--border-focus)">
          <span aria-hidden="true" className={bx('size-7 rounded-full border-2', value.toLowerCase() === color.toLowerCase() ? 'border-(--text-primary)' : 'border-transparent')} style={{ backgroundColor: color }} />
        </button>
      ))}
      <label className="relative flex size-10 cursor-pointer items-center justify-center rounded-full" aria-label={`Custom ${name || 'colour'}`}>
        <span className="flex size-7 items-center justify-center rounded-full border-2 border-dashed border-(--border-strong)">
          <Plus size={12} className="text-(--text-muted)" aria-hidden="true" />
        </span>
        <input type="color" value={six} onChange={(e) => onPick(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </div>
  );
}

/** The brand colour: swatches, and a hex box for an exact colour. */
function BrandColour({ value, onPick }: { value: string; onPick: (color: string) => void }) {
  const id = useId();
  const [typed, setTyped] = useState(value);
  const [seen, setSeen] = useState(value);
  const [error, setError] = useState<string | null>(null);
  // follows the colour when it changes from outside (a swatch, undo, a layout's own colour)
  if (value !== seen) {
    setTyped(value);
    setError(null);
    setSeen(value);
  }
  const commit = () => {
    const hex = typed.trim();
    if (!HEX.test(hex)) {
      setError('Enter a hex colour, like #1D4ED8');
      setTyped(value);
      return;
    }
    setError(null);
    onPick(hex);
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="bg-label">Brand colour</span>
      <Swatches value={value} onPick={onPick} name="brand colour" />
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="size-9 shrink-0 rounded-md border border-(--border-default)" style={{ backgroundColor: value }} />
        <div className="min-w-0 flex-1">
          <Input id={`${id}-hex`} aria-label="Brand colour, hex" value={typed} error={error ?? undefined} className="font-mono" onChange={(e) => setTyped(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
        </div>
      </div>
    </div>
  );
}

export interface BrandingStudioProps {
  formId?: string;
  branding: FormBranding;
  layout: LayoutPreset;
  fieldCount: number;
  isPublic: boolean;
  onBrandingUpdate: (updates: Partial<FormBranding>) => void;
  onLayoutChange: (layout: LayoutPreset) => void;
  /** Opens the real form, full size, in a new tab. Without it there is no Full screen button. */
  onFullScreen?: () => void;
  /** The form's title, edited on the Header section. Without onTitleChange the title is not shown there. */
  formTitle?: string;
  onTitleChange?: (title: string) => void;
}

/**
 * The whole look of a form on one screen. The controls are in five short sections (Layout, Colour, Text, Style, Header) and the form is
 * beside them, large, changing as each control is touched: there is no step to get through first, no preview to open, and a setting is
 * one click away. Choosing a layout applies it at once, with the typeface, card and colour that go with it.
 */
export function BrandingStudio({ formId, branding, layout, fieldCount, isPublic, onBrandingUpdate, onLayoutChange, onFullScreen, formTitle, onTitleChange }: BrandingStudioProps) {
  const [section, setSection] = useState<Section>('layout');
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  // The form is shown at 100%; the - and + step through ZOOM_STEPS, and the percentage between them goes back to 100%.
  const [zoom, setZoom] = useState(1);
  const smaller = [...ZOOM_STEPS].reverse().find((s) => s < zoom - 0.005);
  const larger = ZOOM_STEPS.find((s) => s > zoom + 0.005);
  const { toast } = useToast();
  const uid = useId();
  const set = onBrandingUpdate;
  const brand = branding.primaryColor ?? DEFAULT_COLOR;
  const links = branding.bannerLinks ?? [];
  const setLink = (i: number, change: Partial<BannerLink>) => set({ bannerLinks: links.map((l, j) => (j === i ? { ...l, ...change } : l)) });
  const coverFit: CoverFit = branding.coverFit ?? (branding.coverImageUrl ? 'banner' : 'original');

  const upload = async (file: File, key: 'logoUrl' | 'coverImageUrl' | 'backgroundImageUrl') => {
    try {
      const url = (await uploadService.uploadFile(file)).url;
      // a cover remembers how it was added, so the form shows it the same way (whole, or cropped to the banner)
      set({ [key]: url, ...(key === 'coverImageUrl' ? { coverFit } : {}) });
    } catch (err) {
      toast(isAxiosError(err) && err.response?.status === 413 ? 'That image is too large. Use one under 5 MB.' : 'Upload failed. Check your connection.', 'error');
    }
  };

  const panels: Record<Section, ReactNode> = {
    layout: (
      <LayoutChooser
        current={layout}
        fieldCount={fieldCount}
        isPublic={isPublic}
        onPick={(next) => {
          onLayoutChange(next);
          set(lookBranding(next, branding));
        }}
      />
    ),
    colour: (
      <>
        <BrandColour value={brand} onPick={(color) => set({ primaryColor: color })} />
        <ChipChoice<PanelTreatment>
          label="Colour panel"
          value={branding.panelTreatment ?? 'solid'}
          columns={2}
          options={[{ value: 'solid', label: 'Solid' }, { value: 'gradient', label: 'Gradient' }, { value: 'pattern', label: 'Dots' }, { value: 'image', label: 'Cover image' }]}
          onChange={(panelTreatment) => set({ panelTreatment })}
        />
        <div role="group" aria-label="Page background" className="flex flex-col gap-2">
          <span className="bg-label">Page background</span>
          <div className="grid grid-cols-4 gap-2">
            {PAGE_BACKGROUND_OPTIONS.map((option) => {
              const chosen = (branding.backgroundStyle ?? 'wash') === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={chosen}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => set({ backgroundStyle: option.value as PageBackground })}
                  className={bx(
                    'flex flex-col items-center gap-1 rounded-lg border-2 p-1 focus-visible:outline-2 focus-visible:outline-(--border-focus)',
                    chosen ? 'border-(--action-primary) bg-(--accent-soft)' : 'border-(--border-default) hover:bg-(--surface-hover)',
                  )}
                >
                  {/* each tile is drawn with the very style it picks, in the brand colour, so the choice is seen, not described */}
                  <span aria-hidden="true" className="relative flex h-10 w-full items-center justify-center overflow-hidden rounded-md border border-(--border-subtle)" style={{ ...brandWashStyle({ primaryColor: brand, backgroundColor: branding.backgroundColor, backgroundImageUrl: branding.backgroundImageUrl, backgroundStyle: option.value }), backgroundAttachment: 'scroll' }}>
                    {option.value === 'image' && !branding.backgroundImageUrl && <ImageIcon size={16} className="text-(--text-muted)" />}
                    {chosen && (
                      <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-(--text-primary) text-(--surface-card)">
                        <Check size={10} />
                      </span>
                    )}
                  </span>
                  <span className="bg-caption text-(--text-secondary)">{BACKGROUND_NAME[option.value] ?? option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {branding.backgroundStyle === 'image' && (
          <ImageUploadZone label="Page background image" imageUrl={branding.backgroundImageUrl} aspect="banner" freeform onUpload={(file) => upload(file, 'backgroundImageUrl')} onRemove={() => set({ backgroundImageUrl: undefined, formWidth: undefined, coverFit: undefined })} />
        )}
        {(branding.backgroundStyle ?? 'wash') !== 'plain' && branding.backgroundStyle !== 'image' && (
          <div className="flex flex-col gap-1">
            <span className="bg-label">Page colour</span>
            <Swatches value={branding.backgroundColor ?? brand} onPick={(color) => set({ backgroundColor: color })} name="page colour" />
            {branding.backgroundColor && (
              <button type="button" onClick={() => set({ backgroundColor: undefined })} className="self-start rounded-md bg-body-sm text-(--text-muted) underline underline-offset-2 hover:text-(--text-secondary)">
                Match the brand colour
              </button>
            )}
          </div>
        )}
      </>
    ),
    text: (
      <>
        <div role="group" aria-label="Font" className="flex flex-col gap-2">
          <span className="bg-label">Font</span>
          {FORM_FONT_OPTIONS.map((font) => {
            const chosen = (branding.fontFamily ?? 'dm_sans') === font.value;
            return (
              <button
                key={font.value}
                type="button"
                aria-pressed={chosen}
                onClick={() => set({ fontFamily: font.value as FormFont })}
                // each option is drawn in its own typeface, so the choice is seen, not imagined
                style={{ fontFamily: font.stack }}
                className={bx(
                  'flex min-h-11 items-center gap-3 rounded-lg border-2 px-3 text-left focus-visible:outline-2 focus-visible:outline-(--border-focus)',
                  chosen ? 'border-(--action-primary) bg-(--accent-soft)' : 'border-(--border-default) hover:bg-(--surface-hover)',
                )}
              >
                <span aria-hidden="true" className="w-8 text-xl font-semibold text-(--text-primary)">
                  Aa
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-(--text-primary)">{font.label}</span>
                {chosen && <Check size={16} className="text-(--action-primary)" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <ChipChoice<TypeScale> label="Headline size" value={branding.typeScale ?? 'default'} options={[{ value: 'compact', label: 'Small' }, { value: 'default', label: 'Standard' }, { value: 'large', label: 'Large' }]} onChange={(typeScale) => set({ typeScale })} />
        <ChipChoice<ButtonStyle> label="Buttons" value={branding.buttonStyle ?? 'solid'} columns={2} options={[{ value: 'solid', label: 'Solid' }, { value: 'outline', label: 'Outline' }]} onChange={(buttonStyle) => set({ buttonStyle })} />
        <ChipChoice<ButtonRadius> label="Button corners" value={branding.buttonRadius ?? '8px'} options={[{ value: '4px', label: 'Square' }, { value: '8px', label: 'Rounded' }, { value: '16px', label: 'Pill' }]} onChange={(buttonRadius) => set({ buttonRadius })} />
      </>
    ),
    style: (
      <>
        <ChipChoice<CardStyle> label="Card" value={branding.cardStyle ?? 'soft'} columns={2} options={[{ value: 'flat', label: 'Flat' }, { value: 'soft', label: 'Soft shadow' }, { value: 'bordered', label: 'Bordered' }, { value: 'elevated', label: 'Elevated' }]} onChange={(cardStyle) => set({ cardStyle })} />
        <ChipChoice<FormWidth> label="Form width" value={branding.formWidth ?? 'standard'} options={[{ value: 'narrow', label: 'Narrow' }, { value: 'standard', label: 'Standard' }, { value: 'wide', label: 'Wide' }]} onChange={(formWidth) => set({ formWidth })} />
        <ChipChoice<FormSpacing> label="Spacing" value={branding.spacing ?? 'comfortable'} options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'spacious', label: 'Spacious' }]} onChange={(spacing) => set({ spacing })} />
        <ChipChoice<FieldGrouping> label="Fields" value={branding.fieldGrouping ?? 'auto'} columns={2} options={[{ value: 'auto', label: 'Side by side' }, { value: 'single', label: 'One per row' }]} onChange={(fieldGrouping) => set({ fieldGrouping })} />
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`${uid}-progress`} className="bg-body-sm font-medium text-(--text-secondary)">
            Show the progress bar
          </label>
          <Switch id={`${uid}-progress`} checked={branding.showProgress !== false} onChange={(showProgress) => set({ showProgress })} />
        </div>
      </>
    ),
    header: (
      <>
        {onTitleChange && <Input id={`${uid}-title`} label="Form title" value={formTitle ?? ''} maxLength={200} onChange={(e) => onTitleChange(e.target.value)} />}
        <Textarea id={`${uid}-banner-text`} label="Description" showCount maxLength={500} rows={3} value={branding.bannerText ?? ''} placeholder="A line about this form" onChange={(e) => set({ bannerText: e.target.value || undefined })} />
        <div className="flex flex-col gap-2">
          <span className="bg-label">Links</span>
          {links.map((link, i) => (
            <div key={i} className="flex items-start gap-2">
              <Input id={`${uid}-link-label-${i}`} aria-label={`Link ${i + 1} text`} maxLength={60} value={link.label ?? ''} placeholder="Link text" onChange={(e) => setLink(i, { label: e.target.value || undefined })} />
              <Input id={`${uid}-link-url-${i}`} aria-label={`Link ${i + 1} address`} type="url" inputMode="url" value={link.url} placeholder="https://" error={link.url && !safeHttpUrl(link.url) ? 'Start with http:// or https://' : undefined} onChange={(e) => setLink(i, { url: e.target.value })} />
              <Button type="button" variant="ghost" size="small" aria-label={`Remove link ${i + 1}`} onClick={() => set({ bannerLinks: links.filter((_, j) => j !== i) })} className="min-h-10 min-w-10 p-2">
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
          ))}
          {links.length < MAX_LINKS && (
            <Button type="button" variant="secondary" size="small" onClick={() => set({ bannerLinks: [...links, { url: '' }] })} className="w-fit">
              <Plus size={14} className="mr-1.5" aria-hidden="true" />
              Add link
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="bg-label">Logo</span>
          <ImageUploadZone label="Logo" imageUrl={branding.logoUrl} aspect="square" onUpload={(file) => upload(file, 'logoUrl')} onRemove={() => set({ logoUrl: undefined })} />
          <p className="bg-caption text-(--text-muted)">Square, 256 × 256 or larger.</p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="bg-label">Cover image</span>
          <ChipChoice<CoverFit> label="Shape" value={coverFit} columns={2} options={[{ value: 'original', label: 'Whole picture' }, { value: 'banner', label: 'Wide banner' }]} onChange={(next) => set({ coverFit: next })} />
          {branding.coverImageUrl && coverFit === 'banner' && (
            <ChipChoice<CoverPosition> label="Show the" value={branding.coverPosition ?? 'center'} options={[{ value: 'top', label: 'Top' }, { value: 'center', label: 'Middle' }, { value: 'bottom', label: 'Bottom' }]} onChange={(coverPosition) => set({ coverPosition })} />
          )}
          <ImageUploadZone label="Cover image" imageUrl={branding.coverImageUrl} aspect="banner" freeform={coverFit === 'original'} onUpload={(file) => upload(file, 'coverImageUrl')} onRemove={() => set({ coverImageUrl: undefined })} />
        </div>
      </>
    ),
  };

  return (
    // No title row of its own: the tab above already says Branding, and the screen switch and Reset sit above the preview, level with
    // the section tabs, so the controls and the form start right under the builder's tabs.
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">Branding</h2>
      <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <Card className="flex min-w-0 flex-col gap-4 p-4 lg:max-h-[calc(100vh-16.5rem)] lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs tabs={SECTIONS} activeId={section} onChange={(id) => setSection(id as Section)} ariaLabel="Branding sections" panelId="branding-section" />
          <div role="tabpanel" id="branding-section" aria-labelledby={`tab-${section}`} className="flex flex-col gap-5">
            {panels[section]}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20">
          {/* The screen switch sits in the preview's top left, the zoom and Full screen in its bottom right, so the form has the whole column. */}
          <div className="relative h-[calc(100vh-16.5rem)] min-h-96">
            {formId ? <LiveFormPreview fill zoom={zoom} formId={formId} branding={branding} title={formTitle} layout={layout} device={device} /> : <p className="bg-body-sm text-(--text-muted)">Save the form to see a live preview.</p>}
            <Segmented
              ariaLabel="Preview device"
              className="absolute left-3 top-3 z-10 shadow-(--shadow-md)"
              value={device}
              options={[{ id: 'desktop', label: 'Desktop' }, { id: 'tablet', label: 'Tablet' }, { id: 'mobile', label: 'Mobile' }]}
              onChange={(next) => {
                setDevice(next as PreviewDevice);
                setZoom(1);
              }}
            />
            <div className="absolute bottom-3 right-6 z-10 flex items-center gap-0.5 rounded-lg bg-(--surface-card) p-0.5 shadow-(--shadow-md) ring-1 ring-(--border-default)">
              <div role="group" aria-label="Preview zoom" className="flex items-center gap-0.5">
                <Button type="button" variant="ghost" size="small" aria-label="Zoom out" disabled={smaller === undefined} onClick={() => smaller !== undefined && setZoom(smaller)} className="min-h-8 min-w-8 p-1.5">
                  <Minus size={16} aria-hidden="true" />
                </Button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  aria-label="Back to 100%"
                  title="Back to 100%"
                  className="min-h-8 min-w-12 rounded-md bg-(--accent-soft) px-1.5 bg-body-sm font-medium tabular-nums text-(--accent-soft-text) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <Button type="button" variant="ghost" size="small" aria-label="Zoom in" disabled={larger === undefined} onClick={() => larger !== undefined && setZoom(larger)} className="min-h-8 min-w-8 p-1.5">
                  <Plus size={16} aria-hidden="true" />
                </Button>
              </div>
              {onFullScreen && formId && (
                <Button type="button" variant="ghost" size="small" aria-label="Full screen" title="Open the real form in a new tab" onClick={onFullScreen} className="min-h-8 min-w-8 p-1.5">
                  <Maximize2 size={16} aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
