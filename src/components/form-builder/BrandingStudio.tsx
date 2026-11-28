'use client';

import { isAxiosError } from 'axios';
import { useId, useState, type ReactNode } from 'react';
import { Check, ImageIcon, LayoutTemplate, Maximize2, Minus, MousePointerClick, Palette, PanelTop, PartyPopper, Plus, Rows3, Sparkles, TextCursorInput, Type, Wallpaper, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { safeHttpUrl } from '@/lib/fieldDisplay';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { DeviceSwitch, FLOATING_BAR } from '@/components/preview/PreviewBar';
import type { PreviewDevice } from '@/components/preview/DeviceToggle';
import { FONT_GROUPS, FORM_FONT_OPTIONS, PAGE_BACKGROUND_OPTIONS, brandCardClass, brandWashStyle, cleanTheme, patchTheme, themeOptionBlocked, withCredit } from '@/lib/formTheme';
import { layoutSupports } from '@/lib/layoutSupport';
import { LAYOUT_PRESETS, lookBranding } from '@/lib/layoutPresets';
import { uploadService } from '@/services/upload';
import { bx } from '@/lib/utils';
import type { BannerLink, ButtonRadius, CropMemo, FormTheme, ButtonStyle, CardStyle, CoverFit, CoverPosition, FieldGrouping, FormBranding, FormFont, FormSpacing, FormWidth, LayoutPreset, LogoSize, PageBackground, PanelTreatment, PhotoCredit, TypeScale } from '@/types/form';
import { ImageUploadZone } from './BrandingPanel';
import type { CropFrame } from './ImageCropModal';
import { LayoutChooser } from './LayoutChooser';
import { PictureChoice } from './PicturePicker';
import { LooksDialog } from './LooksDialog';
import { currentLook, styleUpdates } from '@/lib/formStyles';
import { ThankYouControls } from './ThankYouControls';
import { BackgroundLook, ButtonsLook, CARD_RADIUS_PRESET, CoverHeight, CustomBadge, ExactSizes, FieldsLook, FooterNoteField, FormColours, GAP_PRESET, PanelSide, ProgressLook, WIDTH_PRESET, type ExactSize, type SetTheme } from './LookControls';
import { ZOOM_STEPS } from '@/lib/previewZoom';
import { LiveFormPreview } from './LiveFormPreview';

const PRESET_COLORS = ['#1D4ED8', '#0F172A', '#16A34A', '#DC2626', '#9333EA'];
const DEFAULT_COLOR = '#1D4ED8';
const MAX_LINKS = 5;
const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

type Section = 'layout' | 'arrange' | 'colours' | 'fonts' | 'background' | 'header' | 'fields' | 'buttons' | 'thanks';
// One section per thing on the form, named the way a person would ask for it, each saying what is inside.
const SECTIONS: { id: Section; label: string; title: string; hint: string; icon: LucideIcon }[] = [
  { id: 'layout', label: 'Layout', title: 'Layout', hint: 'The overall shape of your form. Pick one to see it on the right.', icon: LayoutTemplate },
  { id: 'arrange', label: 'Arrange', title: 'Arrange', hint: 'Form width, spacing, fields per row and the progress bar.', icon: Rows3 },
  { id: 'colours', label: 'Colours', title: 'Colours', hint: 'Your brand colour, and the colours of text and boxes.', icon: Palette },
  { id: 'fonts', label: 'Fonts', title: 'Fonts', hint: 'The typeface of your form and the size of its title.', icon: Type },
  { id: 'background', label: 'Background', title: 'Background', hint: 'What is behind your form, and the card around it.', icon: Wallpaper },
  { id: 'header', label: 'Header', title: 'Header and footer', hint: 'Title, logo and cover at the top, and a note at the bottom.', icon: PanelTop },
  { id: 'fields', label: 'Fields', title: 'Fields', hint: 'The boxes people type in and the choices they pick.', icon: TextCursorInput },
  { id: 'buttons', label: 'Buttons', title: 'Buttons', hint: 'How Next, Back and Submit look, and what they say.', icon: MousePointerClick },
  { id: 'thanks', label: 'Thank you', title: 'Thank-you screen', hint: 'What people see after they send the form. The message is set in Settings.', icon: PartyPopper },
];

/** Names what the chosen layout does not draw, so a setting that is not here is not looked for. */
function NotInLayout({ layout, missing }: { layout: LayoutPreset; missing: (string | false)[] }) {
  const names = missing.filter((m): m is string => !!m);
  if (names.length === 0) return null;
  const layoutName = LAYOUT_PRESETS.find((p) => p.id === layout)?.name ?? layout;
  return (
    <p className="rounded-lg bg-(--bg-subtle) px-3 py-2 bg-caption text-(--text-muted)">
      The {layoutName} layout does not use {names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0]}, so {names.length > 1 ? 'they are' : 'it is'} not shown.
    </p>
  );
}

const COLUMNS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const;

/** The short name under each page background tile (the full name is its label). */
const BACKGROUND_NAME: Record<string, string> = { wash: 'Glow', plain: 'Plain', solid: 'Solid', gradient: 'Gradient', mesh: 'Mesh', dots: 'Dots', grid: 'Grid', image: 'Image' };

/** A few set choices, one click each: a row of buttons, the chosen one marked. Faster to use (and to see) than a drop-down. */
function ChipChoice<T extends string>({ label, value, options, onChange, columns = 3, custom }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; columns?: 2 | 3 | 4; custom?: boolean }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <span id={id} className="bg-label">
        {label}
        {custom && <CustomBadge />}
      </span>
      <div className={bx('grid gap-2', COLUMNS[columns])}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={!custom && value === o.value}
            onClick={() => onChange(o.value)}
            className={bx(
              'min-h-10 rounded-lg border-2 px-2 bg-body-sm font-medium focus-visible:outline-2 focus-visible:outline-(--border-focus)',
              !custom && value === o.value ? 'border-(--action-primary) bg-(--accent-soft) text-(--text-primary)' : 'border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover)',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The four card looks, each drawn as a small card on a page, so the difference is seen before it is chosen. */
const CARD_STYLES: { value: CardStyle; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'soft', label: 'Soft shadow' },
  { value: 'bordered', label: 'Bordered' },
  { value: 'elevated', label: 'Elevated' },
];

function CardStyleTiles({ value, brand, onChange, custom }: { value: CardStyle; brand: string; onChange: (value: CardStyle) => void; custom?: boolean }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <span id={id} className="bg-label">
        Card style
        {custom && <CustomBadge />}
      </span>
      <div className="grid grid-cols-2 gap-2">
        {CARD_STYLES.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={!custom && value === o.value}
            onClick={() => onChange(o.value)}
            className={bx(
              'flex flex-col gap-2 rounded-lg border-2 p-2 bg-body-sm font-medium focus-visible:outline-2 focus-visible:outline-(--border-focus)',
              !custom && value === o.value ? 'border-(--action-primary) bg-(--accent-soft) text-(--text-primary)' : 'border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover)',
            )}
          >
            {/* a page with a card on it, drawn with the same classes as the real form card */}
            <span aria-hidden="true" data-theme="light" className="flex h-14 items-center justify-center rounded-md bg-(--bg-subtle) px-4" style={{ ['--action-primary' as string]: brand }}>
              <span className={bx(brandCardClass({ cardStyle: o.value }), 'block h-9 w-full')} />
            </span>
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
  /** A workspace slug or 'personal': where "My styles" are kept. Without it only the ready-made looks are offered. */
  styleScope?: string;
}

/**
 * The whole look of a form on one screen. A rail of sections (one per part of the form) is on the left, the open section's controls
 * beside it, and the form large on the right, changing as each control is touched: there is no step to get through first and no
 * preview to open. Only what the chosen layout draws is offered. Choosing a layout applies it at once, with the typeface, card and
 * colour that go with it.
 */
export function BrandingStudio({ formId, branding, layout, fieldCount, isPublic, onBrandingUpdate, onLayoutChange, onFullScreen, formTitle, onTitleChange, styleScope }: BrandingStudioProps) {
  const [looksOpen, setLooksOpen] = useState(false);
  const [section, setSection] = useState<Section>('layout');
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  // The thank-you screen is shown in the preview on request (nobody sees it until they have sent the form), and only while its controls are open.
  const [showThanks, setShowThanks] = useState(false);
  // The form is shown at 100%; the - and + step through ZOOM_STEPS, and the percentage between them goes back to 100%.
  const [zoom, setZoom] = useState(1);
  const smaller = [...ZOOM_STEPS].reverse().find((s) => s < zoom - 0.005);
  const larger = ZOOM_STEPS.find((s) => s > zoom + 0.005);
  const { toast } = useToast();
  const uid = useId();
  const set = onBrandingUpdate;
  // A whole look in one click (a ready-made one, or one of "My styles"): the layout and every look setting change, the form's own logo, uploads,
  // title and text stay, and Undo puts back exactly what was there.
  const applyLook = (look: Parameters<typeof styleUpdates>[0] & { layout: LayoutPreset }, name: string) => {
    const before = currentLook(branding);
    const beforeLayout = layout;
    onLayoutChange(look.layout);
    set(styleUpdates(look, branding));
    setLooksOpen(false);
    toast(`${name} look applied.`, 'success', undefined, {
      label: 'Undo',
      onClick: () => {
        onLayoutChange(beforeLayout);
        set(before);
      },
    });
  };
  const theme = branding.theme;
  // One group of branding.theme at a time; an emptied theme is saved as null, which clears it on the server.
  const setTheme: SetTheme = (group, patch) => set({ theme: patchTheme(theme, group, patch) });
  // Choosing a preset where an exact value is in use puts the preset back and says so, with an Undo that restores both.
  const pickPreset = (apply: Partial<FormBranding>, cleared: FormTheme | null, had: boolean, what: string) => {
    const before: Partial<FormBranding> = { theme: theme ?? null };
    for (const k of Object.keys(apply)) (before as Record<string, unknown>)[k] = branding[k as keyof FormBranding];
    // the theme is only touched when an exact value was in use: a form without one sends exactly what it always sent
    set({ ...apply, ...(had ? { theme: cleared } : {}) });
    if (had) toast(`${what} is back to the preset.`, 'info', undefined, { label: 'Undo', onClick: () => set(before) });
  };
  const brand = branding.primaryColor ?? DEFAULT_COLOR;
  const links = branding.bannerLinks ?? [];
  const setLink = (i: number, change: Partial<BannerLink>) => set({ bannerLinks: links.map((l, j) => (j === i ? { ...l, ...change } : l)) });
  const coverFit: CoverFit = branding.coverFit ?? (branding.coverImageUrl ? 'banner' : 'original');
  // A picture change also sets (an Unsplash photo) or clears (anything else) that picture's photographer credit, so a credit never outlives its photo.
  // The same goes for a remembered crop: it belongs to the picture it made, so a different picture clears it, and a crop sets its own.
  const setPicture = (slot: 'cover' | 'background', patch: Partial<FormBranding>, credit?: PhotoCredit, memo?: CropMemo) => {
    const t = cleanTheme(theme);
    if (!credit && !memo && !t?.credit?.[slot] && !t?.crop?.[slot]) {
      set(patch);
      return;
    }
    set({ ...patch, theme: patchTheme(withCredit(theme, slot, credit), 'crop', { [slot]: memo } as NonNullable<FormTheme['crop']>) });
  };
  const creditOf = (slot: 'cover' | 'background') => cleanTheme(theme)?.credit?.[slot];
  // The logo is cropped to a square; its crop is remembered the same way, so it opens on the original at the zoom and place it was left at.
  const setLogo = (logoUrl: string | undefined, memo?: CropMemo) => {
    if (!memo && !cleanTheme(theme)?.crop?.logo) {
      set({ logoUrl });
      return;
    }
    set({ logoUrl, theme: patchTheme(theme, 'crop', { logo: memo } as NonNullable<FormTheme['crop']>) });
  };

  /** An upload for a place in the theme (the thank-you picture): its address, or nothing after telling the person why. */
  const uploadForTheme = async (file: File): Promise<string | undefined> => {
    try {
      return (await uploadService.uploadFile(file)).url;
    } catch (err) {
      toast(isAxiosError(err) && err.response?.status === 413 ? 'That image is too large. Use one under 5 MB.' : 'Upload failed. Check your connection.', 'error');
      return undefined;
    }
  };

  const upload = async (file: File, key: 'logoUrl' | 'coverImageUrl' | 'backgroundImageUrl', crop?: CropFrame & { from: string }) => {
    try {
      const url = (await uploadService.uploadFile(file)).url;
      // a cover remembers how it was added, so the form shows it the same way (whole, or cropped to the banner)
      if (key === 'logoUrl') setLogo(url, crop ? { ...crop, result: url } : undefined);
      else setPicture(key === 'coverImageUrl' ? 'cover' : 'background', { [key]: url, ...(key === 'coverImageUrl' ? { coverFit } : {}) }, undefined, crop ? { ...crop, result: url } : undefined);
    } catch (err) {
      toast(isAxiosError(err) && err.response?.status === 413 ? 'That image is too large. Use one under 5 MB.' : 'Upload failed. Check your connection.', 'error');
    }
  };

  const supports = layoutSupports(layout);
  const customCard = theme?.card?.radius !== undefined || theme?.card?.shadow !== undefined;
  const cardSizes: ExactSize[] = [
    { label: 'Card corners', value: theme?.card?.radius, preset: CARD_RADIUS_PRESET[branding.cardStyle ?? 'soft'], min: 0, max: 40, onChange: (radius) => setTheme('card', { radius }) },
    { label: 'Card shadow', value: theme?.card?.shadow, preset: 40, min: 0, max: 100, unit: '', onChange: (shadow) => setTheme('card', { shadow }) },
  ];
  const arrangeSizes: ExactSize[] = [
    { label: 'Biggest form width', value: theme?.layout?.maxWidth, preset: WIDTH_PRESET[branding.formWidth ?? 'standard'], min: 360, max: 1400, step: 10, onChange: (maxWidth) => setTheme('layout', { maxWidth }) },
    ...(supports.spacing ? [{ label: 'Space between fields', value: theme?.layout?.fieldGap, preset: GAP_PRESET[branding.spacing ?? 'comfortable'], min: 4, max: 64, onChange: (fieldGap: number | undefined) => setTheme('layout', { fieldGap }) }] : []),
    ...(themeOptionBlocked('panelSide', layout) ? [] : [{ label: 'Picture width', value: theme?.layout?.panelSplit, preset: 40, min: 20, max: 80, step: 5, unit: '%', onChange: (panelSplit: number | undefined) => setTheme('layout', { panelSplit }) }]),
  ];
  const fieldSizes: ExactSize[] = themeOptionBlocked('fieldRadius', layout, theme)
    ? []
    : [{ label: 'Exact field corners', value: theme?.fields?.radius, preset: 10, min: 0, max: 32, onChange: (radius) => setTheme('fields', { radius }) }];

  const panels: Record<Section, ReactNode> = {
    layout: (
      <LayoutChooser
        current={layout}
        fieldCount={fieldCount}
        isPublic={isPublic}
        onPick={(next) => {
          onLayoutChange(next);
          set(lookBranding(next, branding, false, layout));
        }}
      />
    ),
    arrange: (
      <>
        <ChipChoice<FormWidth>
          label="Form width"
          value={branding.formWidth ?? 'standard'}
          custom={theme?.layout?.maxWidth !== undefined}
          options={[{ value: 'narrow', label: 'Narrow' }, { value: 'standard', label: 'Standard' }, { value: 'wide', label: 'Wide' }]}
          onChange={(formWidth) => pickPreset({ formWidth }, patchTheme(theme, 'layout', { maxWidth: undefined }), theme?.layout?.maxWidth !== undefined, 'The form width')}
        />
        {supports.spacing && (
          <ChipChoice<FormSpacing>
            label="Spacing"
            value={branding.spacing ?? 'comfortable'}
            custom={theme?.layout?.fieldGap !== undefined}
            options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'spacious', label: 'Spacious' }]}
            onChange={(spacing) => pickPreset({ spacing }, patchTheme(theme, 'layout', { fieldGap: undefined }), theme?.layout?.fieldGap !== undefined, 'The spacing')}
          />
        )}
        {supports.columns && (
          <ChipChoice<FieldGrouping> label="Short fields" value={branding.fieldGrouping ?? 'auto'} columns={2} options={[{ value: 'auto', label: 'Side by side' }, { value: 'single', label: 'One per row' }]} onChange={(fieldGrouping) => set({ fieldGrouping })} />
        )}
        <PanelSide branding={branding} layout={layout} setTheme={setTheme} />
        {supports.progressSwitch && (
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={`${uid}-progress`} className="flex flex-col">
              <span className="bg-body-sm font-medium text-(--text-secondary)">Show the progress bar</span>
              <span className="bg-caption text-(--text-muted)">Seen on forms with more than one page.</span>
            </label>
            <Switch id={`${uid}-progress`} checked={branding.showProgress !== false} onChange={(showProgress) => set({ showProgress })} />
          </div>
        )}
        {(!supports.progressSwitch || branding.showProgress !== false) && <ProgressLook branding={branding} layout={layout} setTheme={setTheme} />}
        <ExactSizes sizes={arrangeSizes} note="The form width is a biggest width: on a small screen the form still fits the screen." />
        <NotInLayout layout={layout} missing={[!supports.spacing && 'spacing', !supports.columns && 'side by side fields', !supports.progressSwitch && 'a progress bar of your choosing']} />
      </>
    ),
    colours: (
      <>
        <BrandColour value={brand} onPick={(color) => set({ primaryColor: color })} />
        {/* Split Feature has a card surface of its own, so the card colour still applies there. */}
        <FormColours branding={branding} setTheme={setTheme} onBrand={(primaryColor) => set({ primaryColor })} hideCard={!supports.card && layout !== 'split_feature'} />
        <NotInLayout layout={layout} missing={[!supports.card && layout !== 'split_feature' && 'a card colour']} />
      </>
    ),
    fonts: (
      <>
        <div role="group" aria-label="Text font" className="flex flex-col gap-2">
          <span className="bg-label">Text font</span>
          {FONT_GROUPS.map((group) => (
            <div key={group.id} role="group" aria-label={group.label} className="flex flex-col gap-2">
              <span className="pt-1 bg-caption font-semibold text-(--text-muted)">{group.label}</span>
              <div className="grid grid-cols-2 gap-2">
                {FORM_FONT_OPTIONS.filter((f) => f.group === group.id).map((font) => {
                  const chosen = (branding.fontFamily ?? 'dm_sans') === font.value;
                  const [name, ...rest] = font.label.split(' — ');
                  return (
                    <button
                      key={font.value}
                      type="button"
                      aria-pressed={chosen}
                      title={font.label}
                      onClick={() => set({ fontFamily: font.value as FormFont })}
                      // each box is drawn in its own typeface, so the choice is seen, not imagined
                      style={{ fontFamily: font.stack }}
                      className={bx(
                        'relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-lg border-2 px-2 py-3 text-center focus-visible:outline-2 focus-visible:outline-(--border-focus)',
                        chosen ? 'border-(--action-primary) bg-(--accent-soft)' : 'border-(--border-default) hover:bg-(--surface-hover)',
                      )}
                    >
                      <span aria-hidden="true" className="text-3xl font-semibold leading-none text-(--text-primary)">
                        Aa
                      </span>
                      <span className="text-sm leading-tight text-(--text-primary)">{name}</span>
                      {rest.length > 0 && <span className="text-xs leading-tight text-(--text-muted)">{rest.join(' — ')}</span>}
                      {chosen && (
                        <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-(--action-primary) text-white">
                          <Check size={12} aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <Select id={`${uid}-heading-font`} label="Heading font" value={theme?.fonts?.heading ?? ''} onChange={(e) => setTheme('fonts', { heading: (e.target.value || undefined) as FormFont | undefined })}>
            <option value="">Same as the text</option>
            {FONT_GROUPS.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {FORM_FONT_OPTIONS.filter((f) => f.group === group.id).map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <p className="bg-caption text-(--text-muted)">Used for the form title and page titles. The questions keep the text font.</p>
        </div>
        <ChipChoice<TypeScale> label="Title size" value={branding.typeScale ?? 'default'} options={[{ value: 'compact', label: 'Small' }, { value: 'default', label: 'Standard' }, { value: 'large', label: 'Large' }]} onChange={(typeScale) => set({ typeScale })} />
      </>
    ),
    background: (
      <>
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
                  <span aria-hidden="true" data-theme="light" className="relative flex h-10 w-full items-center justify-center overflow-hidden rounded-md border border-(--border-subtle)" style={{ ...brandWashStyle({ primaryColor: brand, backgroundColor: branding.backgroundColor, backgroundImageUrl: branding.backgroundImageUrl, backgroundStyle: option.value }), backgroundAttachment: 'scroll' }}>
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
          <PictureChoice label="Pictures to choose from" value={branding.backgroundImageUrl} onPick={(url, credit) => setPicture('background', { backgroundImageUrl: url }, credit)} />
        )}
        {branding.backgroundStyle === 'image' && (
          <ImageUploadZone label="Page background image" imageUrl={branding.backgroundImageUrl} aspect="banner" freeform cropMemo={theme?.crop?.background} onUploadSource={uploadForTheme} onUrlChange={(url) => setPicture('background', { backgroundImageUrl: url }, creditOf('background'))} onUpload={(file, crop) => upload(file, 'backgroundImageUrl', crop)} onRemove={() => setPicture('background', { backgroundImageUrl: undefined, formWidth: undefined, coverFit: undefined })} />
        )}
        <BackgroundLook branding={branding} setTheme={setTheme} />
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
        {supports.card && (
          <>
            <div className="border-t border-(--border-subtle) pt-4">
              <CardStyleTiles
                value={branding.cardStyle ?? 'soft'}
                brand={brand}
                custom={customCard}
                onChange={(cardStyle) => pickPreset({ cardStyle }, patchTheme(theme, 'card', { radius: undefined, shadow: undefined }), customCard, 'The card')}
              />
            </div>
            <ExactSizes sizes={cardSizes} />
          </>
        )}
        <NotInLayout layout={layout} missing={[!supports.card && 'a card']} />
      </>
    ),
    header: (
      <>
        {onTitleChange && <Input id={`${uid}-title`} label="Form title" value={formTitle ?? ''} maxLength={200} onChange={(e) => onTitleChange(e.target.value)} />}
        {supports.description && (
          <>
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
          </>
        )}
        {supports.logo && (
          <div className="flex flex-col gap-2 border-t border-(--border-subtle) pt-4">
            <span className="bg-label">Logo</span>
            <ImageUploadZone label="Logo" imageUrl={branding.logoUrl} aspect="square" cropMemo={theme?.crop?.logo} onUploadSource={uploadForTheme} onUpload={(file, crop) => upload(file, 'logoUrl', crop)} onRemove={() => setLogo(undefined)} />
            <p className="bg-caption text-(--text-muted)">Square, 256 × 256 or larger.</p>
            <ChipChoice<LogoSize> label="Logo size" value={branding.logoSize ?? 'md'} options={[{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }]} onChange={(logoSize) => set({ logoSize })} />
          </div>
        )}
        {supports.cover && (
          <div className="flex flex-col gap-2 border-t border-(--border-subtle) pt-4">
            <span className="bg-label">Cover image</span>
            {supports.coverShape && (
              <>
                <ChipChoice<CoverFit> label="Shape" value={coverFit} columns={2} options={[{ value: 'original', label: 'Whole picture' }, { value: 'banner', label: 'Wide banner' }]} onChange={(next) => set({ coverFit: next })} />
                {!(branding.coverImageUrl && coverFit === 'original') && <CoverHeight branding={branding} setTheme={setTheme} />}
                {branding.coverImageUrl && coverFit === 'banner' && (
                  <ChipChoice<CoverPosition> label="Show the" value={branding.coverPosition ?? 'center'} options={[{ value: 'top', label: 'Top' }, { value: 'center', label: 'Middle' }, { value: 'bottom', label: 'Bottom' }]} onChange={(coverPosition) => set({ coverPosition })} />
                )}
              </>
            )}
            <PictureChoice label="Pictures to choose from" value={branding.coverImageUrl} onPick={(url, credit) => setPicture('cover', { coverImageUrl: url, coverFit }, credit)} />
            <ImageUploadZone label="Cover image" imageUrl={branding.coverImageUrl} aspect="banner" freeform={coverFit === 'original'} cropMemo={theme?.crop?.cover} onUploadSource={uploadForTheme} onUrlChange={(url) => setPicture('cover', { coverImageUrl: url, coverFit }, creditOf('cover'))} onUpload={(file, crop) => upload(file, 'coverImageUrl', crop)} onRemove={() => setPicture('cover', { coverImageUrl: undefined })} />
            {layout === 'split_feature' && (
              <>
                <p className="bg-caption text-(--text-muted)">A tall picture works best for this layout. Keep faces and important details away from the title.</p>
                <ChipChoice<'top' | 'bottom'> label="Title position" value={theme?.layout?.panelText ?? 'bottom'} columns={2} options={[{ value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }]} onChange={(next) => setTheme('layout', { panelText: next === 'top' ? 'top' : undefined })} />
              </>
            )}
          </div>
        )}
        {supports.banner && (
          <ChipChoice<PanelTreatment>
            label={layout === 'split_feature' ? 'Side panel style' : 'Banner style'}
            value={branding.panelTreatment ?? 'solid'}
            columns={2}
            options={[{ value: 'solid', label: 'Solid' }, { value: 'gradient', label: 'Gradient' }, { value: 'pattern', label: 'Dots' }, { value: 'image', label: 'Cover image' }]}
            onChange={(panelTreatment) => set({ panelTreatment })}
          />
        )}
        <div className="border-t border-(--border-subtle) pt-4">
          <FooterNoteField branding={branding} setTheme={setTheme} />
        </div>
        <NotInLayout layout={layout} missing={[!supports.description && 'a description or links', !supports.logo && 'a logo', !supports.cover && 'a cover image', !supports.banner && 'a banner colour style']} />
      </>
    ),
    fields: (
      <>
        <FieldsLook
          branding={branding}
          layout={layout}
          setTheme={setTheme}
          // The corner presets live in the theme itself, so the choice is always written; Undo is offered only when it replaces an exact value.
          onCorners={(radius) => {
            const exact = theme?.fields?.radius !== undefined && ![0, 8, 20].includes(theme.fields.radius);
            if (exact) pickPreset({}, patchTheme(theme, 'fields', { radius }), true, 'The field corners');
            else setTheme('fields', { radius });
          }}
        />
        <ExactSizes sizes={fieldSizes} />
        <NotInLayout layout={layout} missing={[!!themeOptionBlocked('labelPosition', layout) && 'labels beside the field']} />
      </>
    ),
    buttons: (
      <>
        <ChipChoice<ButtonStyle> label="Button style" value={branding.buttonStyle ?? 'solid'} columns={2} options={[{ value: 'solid', label: 'Solid' }, { value: 'outline', label: 'Outline' }]} onChange={(buttonStyle) => set({ buttonStyle })} />
        <ChipChoice<ButtonRadius> label="Button corners" value={branding.buttonRadius ?? '8px'} options={[{ value: '4px', label: 'Square' }, { value: '8px', label: 'Rounded' }, { value: '16px', label: 'Pill' }]} onChange={(buttonRadius) => set({ buttonRadius })} />
        <ButtonsLook branding={branding} setTheme={setTheme} />
      </>
    ),
    thanks: <ThankYouControls branding={branding} setTheme={setTheme} showPreview={showThanks} onShowPreview={setShowThanks} onUpload={uploadForTheme} />,
  };
  const open = SECTIONS.find((x) => x.id === section) ?? SECTIONS[0];

  return (
    // No title row of its own: the tab above already says Branding, and the screen switch and Reset sit above the preview, level with
    // the section tabs, so the controls and the form start right under the builder's tabs.
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">Branding</h2>
      <LooksDialog isOpen={looksOpen} onClose={() => setLooksOpen(false)} layout={layout} branding={branding} scope={styleScope} onApply={applyLook} />
      <div className="grid items-start lg:grid-cols-[26rem_minmax(0,1fr)] xl:grid-cols-[28rem_minmax(0,1fr)]">
        {/* A flush panel beside the sidebar, the full height under the top bar and the tabs strip (52px + 48px), like the Build
            tab's. The "!" classes: the card style would stack its children in a column and frame them. */}
        <Card className="flex min-w-0 flex-row! gap-0! overflow-hidden rounded-none! border-y-0! border-l-0! p-0! shadow-none! lg:h-[calc(100dvh-6.25rem)]">
          <div className="w-22 shrink-0 overflow-y-auto border-r border-(--border-default) p-1.5 scrollbar-none [&::-webkit-scrollbar]:hidden">
            <Tabs
              vertical
              tabs={SECTIONS.map(({ id, label, icon: Icon }) => ({ id, label, icon: <Icon size={18} aria-hidden="true" /> }))}
              activeId={section}
              // The thank-you screen is shown in the preview as soon as its section is opened: nobody could see what they were changing.
              onChange={(id) => { setSection(id as Section); setShowThanks(id === 'thanks'); }}
              ariaLabel="Branding sections"
              panelId="branding-section"
            />
          </div>
          {/* Keyed by section, so each one opens from its top. */}
          <div key={section} role="tabpanel" id="branding-section" aria-labelledby={`tab-${section}`} className="flex min-w-0 flex-1 animate-fade-in flex-col gap-5 overflow-y-auto p-4 scrollbar-none [&::-webkit-scrollbar]:hidden">
            <div className="flex flex-col gap-1">
              <h3 className="bg-h4 font-bold text-(--text-primary)">{open.title}</h3>
              <p className="bg-body-sm text-(--text-muted)">{open.hint}</p>
            </div>
            {panels[section]}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-3 lg:p-4">
          {/* One floating control at the top, as on the full-screen preview; the zoom and Full screen sit at the bottom. */}
          <div className="relative h-[calc(100dvh-8.25rem)] min-h-96">
            {formId ? <LiveFormPreview fill zoom={zoom} formId={formId} branding={branding} title={formTitle} layout={layout} device={device} screen={showThanks && section === 'thanks' ? 'thanks' : 'form'} /> : <p className="bg-body-sm text-(--text-muted)">Save the form to see a live preview.</p>}
            <div className={FLOATING_BAR}>
              <DeviceSwitch
                device={device}
                onChange={(next) => {
                  setDevice(next);
                  setZoom(1);
                }}
              />
              <Button type="button" variant="ghost" size="small" onClick={() => setLooksOpen(true)} className="rounded-full!">
                <Sparkles size={14} className="mr-1.5" aria-hidden="true" />
                Looks
              </Button>
            </div>
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-full bg-(--surface-card) p-1 shadow-(--shadow-md) ring-1 ring-(--border-default)">
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
