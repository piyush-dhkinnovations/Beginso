'use client';

import { useId, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, ChevronDown, RotateCcw } from 'lucide-react';
import { contrastRatio, fixContrast, TEXT_CONTRAST } from '@/lib/contrast';
import { FOOTER_MAX, LABEL_MAX, brandButtonStyle, brandLookProps, themeOptionBlocked, type ThemeOption } from '@/lib/formTheme';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { bx } from '@/lib/utils';
import type { ButtonHover, ButtonSize, ButtonWidth, ChoiceStyle, FieldStyle, FormBranding, FormTheme, LabelPosition, LayoutPreset, ProgressStyle } from '@/types/form';

// The groups of controls the branding studio has for the form's colours, how its fields look, and exact sizes. Each choice is drawn (a tile that
// looks like what it does), "Default" is one click away, and an option the chosen layout cannot show is switched off with the reason, never ignored.

export type ThemeGroup = 'colors' | 'fields' | 'card' | 'layout' | 'fonts' | 'buttons' | 'labels' | 'progress' | 'footer' | 'success' | 'crop' | 'background' | 'cover';
export type SetTheme = <G extends ThemeGroup>(group: G, patch: Partial<NonNullable<FormTheme[G]>>) => void;

const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
// What each colour is when the owner has not chosen one (the starting value of the picker and the colour the readability checks use).
const DEFAULT = { text: '#041347', heading: '#041347', card: '#FFFFFF', field: '#FFFFFF', fieldBorder: '#DDE1EA', buttonText: '#FFFFFF', page: '#F7F8FB', brand: '#1D4ED8' } as const;
type ColourKey = 'text' | 'heading' | 'card' | 'field' | 'fieldBorder' | 'buttonText';
const COLOURS: { key: ColourKey; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'heading', label: 'Headings' },
  { key: 'card', label: 'Card' },
  { key: 'field', label: 'Fields' },
  { key: 'fieldBorder', label: 'Field border' },
  { key: 'buttonText', label: 'Button text' },
];

export function GroupTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-(--border-subtle) pt-4">
      <h3 className="bg-h5 text-(--text-primary)">{children}</h3>
      {hint && <p className="bg-caption text-(--text-muted)">{hint}</p>}
    </div>
  );
}

/** "Custom" beside a preset group's label while an exact value is in use. */
export function CustomBadge() {
  return <span className="ml-2 rounded-full bg-(--accent-soft) px-2 py-0.5 bg-caption font-semibold text-(--accent-soft-text)">Custom</span>;
}

const six = (v: string) => (v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v);

// ── Colours ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** One colour as a box: a big swatch that opens the picker, its name with a reset, and the hex underneath (empty = the default). */
export function ColourRow({ label, value, fallback, onPick, onReset }: { label: string; value?: string; fallback: string; onPick: (c: string) => void; onReset: () => void }) {
  const id = useId();
  const [typed, setTyped] = useState<string | null>(null);
  const commit = () => {
    if (typed !== null && HEX.test(typed.trim())) onPick(typed.trim());
    setTyped(null);
  };
  return (
    <div className={bx('flex flex-col gap-2 rounded-lg border-2 p-2', value ? 'border-(--action-primary) bg-(--accent-soft)' : 'border-(--border-default)')}>
      <label className="relative block h-11 cursor-pointer" aria-label={`${label} colour`}>
        <span aria-hidden="true" className="block h-11 w-full rounded-md border border-(--border-strong)" style={{ backgroundColor: value ?? fallback }} />
        <input type="color" value={six(value ?? fallback)} onChange={(e) => onPick(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </label>
      <div className="flex items-center justify-between gap-1">
        <label htmlFor={id} className="min-w-0 truncate bg-body-sm font-medium text-(--text-primary)">
          {label}
        </label>
        <button
          type="button"
          onClick={() => {
            setTyped(null);
            onReset();
          }}
          disabled={!value}
          aria-label={`Set ${label.toLowerCase()} back to the default`}
          title="Back to the default"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-(--border-focus)"
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
      </div>
      <input
        id={id}
        value={typed ?? value ?? ''}
        placeholder="Default"
        maxLength={7}
        spellCheck={false}
        onChange={(e) => setTyped(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="h-8 w-full rounded-md border border-(--border-default) bg-(--surface-card) px-2 font-mono text-sm text-(--text-primary) placeholder:font-sans placeholder:text-(--text-muted) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
      />
    </div>
  );
}

// ── Readability ─────────────────────────────────────────────────────────────────────────────────────────────────────

interface Check {
  id: string;
  label: string;
  need: number;
  ratio: number | null;
  /** Why a pair cannot be measured (the page behind has a picture, a gradient...). */
  unknown?: string;
  /** Sets the colour that fixes the pair (the first colour of the pair). */
  fix?: { key: ColourKey | 'brand'; colour: string };
}

/** The page behind the card as one colour, or the reason it is not one. */
export function pageColour(b: Pick<FormBranding, 'backgroundStyle' | 'backgroundColor' | 'primaryColor'>): { hex?: string; why?: string } {
  switch (b.backgroundStyle ?? 'wash') {
    case 'plain':
      return { hex: DEFAULT.page };
    case 'solid':
      return { hex: b.backgroundColor ?? b.primaryColor ?? DEFAULT.brand };
    case 'image':
      return { why: 'the page has a picture' };
    case 'gradient':
    case 'mesh':
      return { why: 'the page has a gradient' };
    default:
      return { why: 'the page has a tinted pattern' };
  }
}

/** The pairs worth checking, measured with the colours the form will really use (the defaults where none is chosen). */
export function readabilityChecks(b: FormBranding): Check[] {
  const c = b.theme?.colors ?? {};
  const text = c.text ?? DEFAULT.text;
  const card = c.card ?? DEFAULT.card;
  const brand = b.primaryColor ?? DEFAULT.brand;
  const outline = b.buttonStyle === 'outline';
  const buttonText = outline ? brand : (c.buttonText ?? DEFAULT.buttonText);
  const buttonBg = outline ? '#FFFFFF' : brand;
  const border = c.fieldBorder ?? DEFAULT.fieldBorder;
  const page = pageColour(b);
  const field = c.field ?? DEFAULT.field;
  const pair = (id: string, label: string, need: number, fg: string, bg: string | undefined, key: ColourKey | 'brand' | null, unknown?: string): Check => {
    const ratio = bg ? contrastRatio(fg, bg) : null;
    const fixed = key && bg && ratio !== null && ratio < need ? fixContrast(fg, bg, need) : null;
    return { id, label, need, ratio, unknown: bg ? undefined : unknown, fix: key && fixed ? { key, colour: fixed } : undefined };
  };
  return [
    pair('text-card', 'Text on the card', TEXT_CONTRAST, text, card, 'text'),
    pair('text-field', 'What people type, on the field', TEXT_CONTRAST, text, field, 'text'),
    pair('text-page', 'Text on the page', TEXT_CONTRAST, text, page.hex, 'text', page.why),
    // Outline buttons are brand colour on white, so the only colour to move is the brand colour itself: no one-tap fix there.
    pair('button', 'Button text on the button', TEXT_CONTRAST, buttonText, buttonBg, outline ? null : 'buttonText'),
    pair('border', 'Field border on the card', 3, border, card, 'fieldBorder'),
    // The brand colour is the button, the focus line and the chosen answer: it has to stand out from what it sits on.
    pair('brand-card', 'Brand colour on the card', 3, brand, card, 'brand'),
    pair('brand-page', 'Brand colour on the page', 3, brand, page.hex, 'brand', page.why),
    ...(c.heading
      ? [
          pair('heading-card', 'Headings on the card', TEXT_CONTRAST, c.heading, card, 'heading'),
          pair('heading-page', 'Headings on the page', TEXT_CONTRAST, c.heading, page.hex, 'heading', page.why),
          // A heading colour also colours the title on the coloured header, so it is measured against the brand colour there (not when the header is a picture).
          pair('heading', 'Headings on the header', TEXT_CONTRAST, c.heading, b.panelTreatment === 'image' ? undefined : brand, 'heading', 'the header has a picture'),
        ]
      : []),
  ];
}

/** The readability of the colours: what needs fixing (with a one-tap Fix) comes first, and the checks that pass are one click away. */
function Readability({ branding, setTheme, onBrand }: { branding: FormBranding; setTheme: SetTheme; onBrand: (colour: string) => void }) {
  const [all, setAll] = useState(false);
  const checks = readabilityChecks(branding);
  const isBad = (k: Check) => k.ratio !== null && k.ratio < k.need;
  const bad = checks.filter(isBad);
  const unknown = checks.filter((k) => k.ratio === null);
  const good = checks.length - bad.length - unknown.length;
  const shown = all ? checks : bad;
  return (
    <div className={bx('flex flex-col gap-2 rounded-lg border-2 p-3', bad.length ? 'border-(--warning-text)' : 'border-(--border-default)')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="bg-label">Readability</span>
          <span role="status" className={bx('bg-body-sm', bad.length ? 'font-medium text-(--warning-text)' : 'text-(--success-text)')}>
            {bad.length ? `${bad.length} to fix` : 'All the colours are easy to read'}
          </span>
          <span className="bg-caption text-(--text-muted)">
            {good} good{unknown.length ? `, ${unknown.length} can't be checked (the page behind is a picture or a pattern)` : ''}
          </span>
        </div>
        <button type="button" aria-expanded={all} onClick={() => setAll((v) => !v)} className="shrink-0 rounded-md bg-caption text-(--text-muted) underline underline-offset-2 hover:text-(--text-secondary)">
          {all ? 'Show less' : 'Show all checks'}
        </button>
      </div>
      {shown.length > 0 && (
        <div className="flex flex-col gap-1.5" role="list" aria-label="Readability of the colours">
          {shown.map((k) => {
            const ok = k.ratio !== null && k.ratio >= k.need;
            return (
              <div key={k.id} role="listitem" className="flex items-start gap-2 bg-body-sm">
                {k.ratio === null ? (
                  <span aria-hidden="true" className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-(--border-strong) text-[0.625rem] text-(--text-muted)">?</span>
                ) : ok ? (
                  <Check size={16} className="mt-0.5 shrink-0 text-(--success-text)" aria-hidden="true" />
                ) : (
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-(--warning-text)" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 text-(--text-secondary)">
                  {k.label}{' '}
                  {k.ratio === null ? (
                    <span className="text-(--text-muted)">Can&apos;t check: {k.unknown ?? 'a colour is not a plain colour'}.</span>
                  ) : (
                    <span className={ok ? 'text-(--text-muted)' : 'font-medium text-(--warning-text)'}>
                      {ok ? `${k.ratio.toFixed(1)} to 1, good.` : `${k.ratio.toFixed(1)} to 1. Needs ${k.need}.`}
                    </span>
                  )}
                </span>
                {k.fix && (
                  <button
                    type="button"
                    onClick={() => (k.fix!.key === 'brand' ? onBrand(k.fix!.colour) : setTheme('colors', { [k.fix!.key]: k.fix!.colour }))}
                    aria-label={`Fix: ${k.label.toLowerCase()}, use ${k.fix.colour}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-(--border-strong) px-2 py-0.5 bg-caption font-semibold text-(--text-primary) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
                  >
                    <span aria-hidden="true" className="size-3 rounded-sm border border-(--border-strong)" style={{ backgroundColor: k.fix.colour }} />
                    Fix
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Text, headings, card, fields, field border and button text as six boxes, then the readability of the pairs. */
export function FormColours({ branding, setTheme, onBrand }: { branding: FormBranding; setTheme: SetTheme; onBrand: (colour: string) => void }) {
  const colours = branding.theme?.colors ?? {};
  const any = COLOURS.some((c) => colours[c.key]);
  return (
    <div className="flex flex-col gap-3">
      <GroupTitle hint="Tap a box to choose a colour. A box left as Default follows the look you picked.">Form colours</GroupTitle>
      <div className="grid grid-cols-2 gap-2">
        {COLOURS.map((c) => (
          <ColourRow key={c.key} label={c.label} value={colours[c.key]} fallback={DEFAULT[c.key]} onPick={(v) => setTheme('colors', { [c.key]: v })} onReset={() => setTheme('colors', { [c.key]: undefined })} />
        ))}
      </div>
      {any && (
        <button type="button" onClick={() => setTheme('colors', Object.fromEntries(COLOURS.map((c) => [c.key, undefined])))} className="self-start rounded-md bg-body-sm text-(--text-muted) underline underline-offset-2 hover:text-(--text-secondary)">
          Reset all colours
        </button>
      )}
      <Readability branding={branding} setTheme={setTheme} onBrand={onBrand} />
    </div>
  );
}

// ── Fields look ─────────────────────────────────────────────────────────────────────────────────────────────────────

function LookTile({ label, chosen, onClick, disabled, children }: { label: string; chosen: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={chosen}
      disabled={disabled}
      onClick={onClick}
      className={bx(
        'flex flex-col gap-2 rounded-lg border-2 p-2 bg-body-sm font-medium focus-visible:outline-2 focus-visible:outline-(--border-focus) disabled:cursor-not-allowed disabled:opacity-45',
        chosen ? 'border-(--action-primary) bg-(--accent-soft) text-(--text-primary)' : 'border-(--border-default) text-(--text-secondary) enabled:hover:bg-(--surface-hover)',
      )}
    >
      <span aria-hidden="true" className="flex h-14 items-center justify-center rounded-md bg-(--bg-subtle) px-3">
        {children}
      </span>
      {label}
    </button>
  );
}

function TileGroup({ label, columns, custom, hint, children }: { label: string; columns: 2 | 3; custom?: boolean; hint?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <span id={id} className="bg-label">
        {label}
        {custom && <CustomBadge />}
      </span>
      <div className={bx('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-3')}>{children}</div>
      {hint && <p className="bg-caption text-(--text-muted)">{hint}</p>}
    </div>
  );
}

/** A small field drawn with the real field classes and the owner's colours, so a tile shows the look as it will be. */
function SampleField({ branding, fieldStyle, radius }: { branding: FormBranding; fieldStyle?: FieldStyle; radius?: number }) {
  const theme: FormTheme = { ...(branding.theme ?? { v: 1 }), fields: { ...branding.theme?.fields, style: fieldStyle ?? branding.theme?.fields?.style, radius: radius ?? branding.theme?.fields?.radius } };
  const { className, style, ...attrs } = brandLookProps({ theme });
  return (
    <span {...attrs} className={bx(className, 'block w-full')} style={style}>
      <span className="form-field-input block h-6 w-full rounded-(--form-field-radius) border border-(--form-field-border) bg-(--form-field-bg)" />
    </span>
  );
}

const FIELD_STYLES: { value: FieldStyle; label: string }[] = [
  { value: 'outlined', label: 'Outlined' },
  { value: 'filled', label: 'Filled' },
  { value: 'underline', label: 'Underline' },
];
export const FIELD_CORNERS: { value: number; label: string }[] = [
  { value: 0, label: 'Square' },
  { value: 8, label: 'Rounded' },
  { value: 20, label: 'Pill' },
];

const Line = ({ w, strong }: { w: string; strong?: boolean }) => <span className={bx('block h-1.5 rounded-full', strong ? 'bg-(--text-secondary)' : 'bg-(--border-strong)')} style={{ width: w }} />;

/** Field style, corners, where the label sits and how choices look. `onCorners` is told when a preset replaces an exact value (so the studio can offer Undo). */
export function FieldsLook({ branding, layout, setTheme, onCorners }: { branding: FormBranding; layout: LayoutPreset; setTheme: SetTheme; onCorners: (radius: number | undefined) => void }) {
  const theme = branding.theme;
  const style: FieldStyle = theme?.fields?.style ?? 'outlined';
  const radius = theme?.fields?.radius;
  const label: LabelPosition = theme?.fields?.label ?? 'above';
  const choice: ChoiceStyle = theme?.fields?.choice ?? 'plain';
  const blocked = (o: ThemeOption) => themeOptionBlocked(o, layout, theme);
  const cornersBlocked = blocked('fieldRadius');
  const labelBlocked = blocked('labelPosition');
  const customCorners = radius !== undefined && !FIELD_CORNERS.some((c) => c.value === radius);
  return (
    <div className="flex flex-col gap-5">
      <GroupTitle hint="How the boxes people type in look.">Field look</GroupTitle>
      <TileGroup label="Field style" columns={3}>
        {FIELD_STYLES.map((o) => (
          <LookTile key={o.value} label={o.label} chosen={style === o.value} onClick={() => setTheme('fields', { style: o.value === 'outlined' ? undefined : o.value })}>
            <SampleField branding={branding} fieldStyle={o.value} />
          </LookTile>
        ))}
      </TileGroup>
      <TileGroup label="Field corners" columns={3} custom={customCorners} hint={cornersBlocked}>
        {FIELD_CORNERS.map((o) => (
          <LookTile key={o.value} label={o.label} chosen={!cornersBlocked && !customCorners && (radius ?? 8) === o.value} disabled={!!cornersBlocked} onClick={() => onCorners(o.value === 8 ? undefined : o.value)}>
            <SampleField branding={branding} radius={o.value} fieldStyle="outlined" />
          </LookTile>
        ))}
      </TileGroup>
      <TileGroup label="Label position" columns={2} hint={labelBlocked ?? (label === 'start' ? 'On a phone the label stays above the field.' : undefined)}>
        <LookTile label="Above the field" chosen={label === 'above' || !!labelBlocked} disabled={!!labelBlocked} onClick={() => setTheme('fields', { label: undefined })}>
          <span className="flex w-full flex-col gap-1">
            <Line w="35%" strong />
            <span className="block h-4 w-full rounded-sm border border-(--border-strong) bg-(--surface-card)" />
          </span>
        </LookTile>
        <LookTile label="Beside the field" chosen={label === 'start' && !labelBlocked} disabled={!!labelBlocked} onClick={() => setTheme('fields', { label: 'start' })}>
          <span className="flex w-full items-center gap-2">
            <span className="w-1/3">
              <Line w="100%" strong />
            </span>
            <span className="block h-4 flex-1 rounded-sm border border-(--border-strong) bg-(--surface-card)" />
          </span>
        </LookTile>
      </TileGroup>
      <TileGroup label="Choices (radio and checkbox)" columns={2}>
        <LookTile label="Plain" chosen={choice === 'plain'} onClick={() => setTheme('fields', { choice: undefined })}>
          <span className="flex w-full flex-col gap-1.5">
            {[0, 1].map((i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className={bx('block size-2.5 rounded-full border', i === 0 ? 'border-(--action-primary) bg-(--action-primary)' : 'border-(--border-strong)')} />
                <Line w="45%" />
              </span>
            ))}
          </span>
        </LookTile>
        <LookTile label="Tiles" chosen={choice === 'tiles'} onClick={() => setTheme('fields', { choice: 'tiles' })}>
          <span className="flex w-full flex-col gap-1">
            {[0, 1].map((i) => (
              <span key={i} className={bx('flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5', i === 0 ? 'border-(--action-primary) bg-(--accent-soft)' : 'border-(--border-strong)')}>
                <span className={bx('block size-2 rounded-full border', i === 0 ? 'border-(--action-primary) bg-(--action-primary)' : 'border-(--border-strong)')} />
                <Line w="45%" />
              </span>
            ))}
          </span>
        </LookTile>
      </TileGroup>
    </div>
  );
}

/** Which side of the form the picture panel is on. Only the Split Feature layout has one; on the others the choice is off, with the reason. */
export function PanelSide({ branding, layout, setTheme }: { branding: FormBranding; layout: LayoutPreset; setTheme: SetTheme }) {
  const side = branding.theme?.layout?.panelSide ?? 'start';
  const blocked = themeOptionBlocked('panelSide', layout);
  const drawing = (end: boolean) => (
    <span className={bx('flex h-9 w-full items-stretch gap-1', end && 'flex-row-reverse')}>
      <span className="w-2/5 rounded-sm bg-(--action-primary)" />
      <span className="flex flex-1 flex-col justify-center gap-1 rounded-sm border border-(--border-strong) bg-(--surface-card) px-1.5">
        <span className="h-1 w-2/3 rounded-full bg-(--border-strong)" />
        <span className="h-1 w-1/2 rounded-full bg-(--border-default)" />
      </span>
    </span>
  );
  return (
    <TileGroup label="Picture side" columns={2} hint={blocked ?? 'On a phone the picture is a header above the form.'}>
      <LookTile label="On the left" chosen={!blocked && side === 'start'} disabled={!!blocked} onClick={() => setTheme('layout', { panelSide: undefined })}>
        {drawing(false)}
      </LookTile>
      <LookTile label="On the right" chosen={!blocked && side === 'end'} disabled={!!blocked} onClick={() => setTheme('layout', { panelSide: 'end' })}>
        {drawing(true)}
      </LookTile>
    </TileGroup>
  );
}

// ── Exact values ────────────────────────────────────────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  value?: number;
  /** What the preset gives now, shown (and used as the starting point) until the owner moves the slider. */
  preset: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (n: number) => void;
  onReset: () => void;
}

export function Slider({ label, value, preset, min, max, step = 1, unit = 'px', onChange, onReset }: SliderProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="bg-body-sm font-medium text-(--text-primary)">
          {label}
        </label>
        <span className="flex items-center gap-1.5 bg-body-sm tabular-nums text-(--text-secondary)">
          {value === undefined ? 'Preset' : `${value}${unit ? ` ${unit}` : ''}`}
          <button
            type="button"
            onClick={onReset}
            disabled={value === undefined}
            aria-label={`Set ${label.toLowerCase()} back to the preset`}
            title="Back to the preset"
            className="flex size-6 items-center justify-center rounded text-(--text-muted) hover:bg-(--surface-hover) disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-(--border-focus)"
          >
            <RotateCcw size={12} aria-hidden="true" />
          </button>
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value ?? preset} onChange={(e) => onChange(Number(e.target.value))} className={bx('w-full accent-(--action-primary)', value === undefined && 'opacity-60')} />
    </div>
  );
}

export const CARD_RADIUS_PRESET = { flat: 0, soft: 16, bordered: 12, elevated: 24 } as const;
export const GAP_PRESET = { compact: 12, comfortable: 16, spacious: 28 } as const;
export const WIDTH_PRESET = { narrow: 576, standard: 672, wide: 896 } as const;

/** Sliders for the values the presets set, folded away until asked for. */
export function FineTune({ branding, layout, setTheme }: { branding: FormBranding; layout: LayoutPreset; setTheme: SetTheme }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const t = branding.theme;
  const touched = [t?.card?.radius, t?.card?.shadow, t?.layout?.maxWidth, t?.layout?.fieldGap, t?.layout?.panelSplit, t?.fields?.radius].some((v) => v !== undefined);
  const cornersBlocked = themeOptionBlocked('fieldRadius', layout, t);
  return (
    <div className="flex flex-col gap-3 border-t border-(--border-subtle) pt-4">
      <button type="button" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((o) => !o)} className="flex items-center justify-between gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-(--border-focus)">
        <span className="flex flex-col gap-0.5">
          <span className="bg-h5 text-(--text-primary)">Fine-tune{touched ? ' (in use)' : ''}</span>
          <span className="bg-caption text-(--text-muted)">Exact sizes, when a preset is close but not right.</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className={bx('shrink-0 text-(--text-muted) transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div id={panel} className="flex flex-col gap-4">
          <Slider label="Card corners" value={t?.card?.radius} preset={CARD_RADIUS_PRESET[branding.cardStyle ?? 'soft']} min={0} max={40} onChange={(radius) => setTheme('card', { radius })} onReset={() => setTheme('card', { radius: undefined })} />
          <Slider label="Card shadow" value={t?.card?.shadow} preset={40} min={0} max={100} unit="" onChange={(shadow) => setTheme('card', { shadow })} onReset={() => setTheme('card', { shadow: undefined })} />
          <Slider label="Biggest form width" value={t?.layout?.maxWidth} preset={WIDTH_PRESET[branding.formWidth ?? 'standard']} min={360} max={1400} step={10} onChange={(maxWidth) => setTheme('layout', { maxWidth })} onReset={() => setTheme('layout', { maxWidth: undefined })} />
          <Slider label="Space between fields" value={t?.layout?.fieldGap} preset={GAP_PRESET[branding.spacing ?? 'comfortable']} min={4} max={64} onChange={(fieldGap) => setTheme('layout', { fieldGap })} onReset={() => setTheme('layout', { fieldGap: undefined })} />
          {!themeOptionBlocked('panelSide', layout) && (
            <Slider label="Picture width" value={t?.layout?.panelSplit} preset={40} min={20} max={80} step={5} unit="%" onChange={(panelSplit) => setTheme('layout', { panelSplit })} onReset={() => setTheme('layout', { panelSplit: undefined })} />
          )}
          {cornersBlocked ? (
            <p className="bg-caption text-(--text-muted)">Field corners: {cornersBlocked}</p>
          ) : (
            <Slider label="Field corners" value={t?.fields?.radius} preset={10} min={0} max={32} onChange={(radius) => setTheme('fields', { radius })} onReset={() => setTheme('fields', { radius: undefined })} />
          )}
          <p className="bg-caption text-(--text-muted)">The form width is a biggest width: on a small screen the form still fits the screen.</p>
          {touched && (
            <button type="button" onClick={() => { setTheme('card', { radius: undefined, shadow: undefined }); setTheme('layout', { maxWidth: undefined, fieldGap: undefined, panelSplit: undefined }); setTheme('fields', { radius: undefined }); }} className="self-start rounded-md bg-body-sm text-(--text-muted) underline underline-offset-2 hover:text-(--text-secondary)">
              Back to the presets
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Buttons and details ─────────────────────────────────────────────────────────────────────────────────────────────

const BUTTON_SIZES: { value: ButtonSize; label: string; h: number; px: number; fs: number }[] = [
  { value: 'small', label: 'Small', h: 22, px: 9, fs: 10 },
  { value: 'default', label: 'Default', h: 28, px: 12, fs: 11 },
  { value: 'large', label: 'Large', h: 34, px: 16, fs: 13 },
];

/** A button drawn in the form's own button look (brand colour, corners, text colour), at one of the sizes. */
function SampleButton({ branding, h = 28, px = 12, fs = 11, text = 'Submit', lift, dark, grow }: { branding: FormBranding; h?: number; px?: number; fs?: number; text?: string; lift?: boolean; dark?: boolean; grow?: boolean }) {
  const base = brandButtonStyle(branding);
  return (
    <span
      className={bx('inline-flex items-center justify-center font-medium', grow && 'flex-1')}
      style={{ ...base, height: h, paddingInline: px, fontSize: fs, ...(lift ? { transform: 'translateY(-3px)', boxShadow: '0 6px 10px rgba(0,0,0,.25)' } : {}), ...(dark ? { filter: 'brightness(0.82)' } : {}) }}
    >
      {text}
    </span>
  );
}

const PROGRESS_STYLES: { value: ProgressStyle; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'dots', label: 'Dots' },
  { value: 'steps', label: 'Steps' },
];

function ProgressSample({ style }: { style: ProgressStyle }) {
  if (style === 'dots') {
    return (
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-(--action-primary)" />
        <span className="h-2 w-4 rounded-full bg-(--action-primary)" />
        <span className="size-2 rounded-full bg-(--border-strong)" />
        <span className="size-2 rounded-full bg-(--border-strong)" />
      </span>
    );
  }
  if (style === 'steps') {
    return (
      <span className="flex items-center">
        <span className="size-4 rounded-full bg-(--action-primary)" />
        <span className="h-0.5 w-3 bg-(--action-primary)" />
        <span className="size-4 rounded-full bg-(--action-primary)" />
        <span className="h-0.5 w-3 bg-(--border-strong)" />
        <span className="size-4 rounded-full border-2 border-(--border-strong)" />
      </span>
    );
  }
  return (
    <span className="block h-1.5 w-full rounded-full bg-(--border-strong)">
      <span className="block h-full w-2/3 rounded-full bg-(--action-primary)" />
    </span>
  );
}

/** One short line of the owner's own words, with its limit shown and an empty box meaning "use the default". */
export function WordsInput({ id, label, value, placeholder, max, onChange }: { id: string; label: string; value?: string; placeholder: string; max: number; onChange: (v: string | undefined) => void }) {
  return (
    <Input
      id={id}
      label={label}
      value={value ?? ''}
      placeholder={placeholder}
      maxLength={max}
      showCount
      onChange={(e) => onChange(e.target.value.replace(/[<>]/g, '') || undefined)}
    />
  );
}

export function ButtonsAndDetails({ branding, layout, setTheme }: { branding: FormBranding; layout: LayoutPreset; setTheme: SetTheme }) {
  const theme = branding.theme;
  const size: ButtonSize = theme?.buttons?.size ?? 'default';
  const width: ButtonWidth = theme?.buttons?.width ?? 'fill';
  const hover: ButtonHover = theme?.buttons?.hover ?? 'none';
  const progress: ProgressStyle = theme?.progress?.style ?? 'bar';
  const progressBlocked = themeOptionBlocked('progressStyle', layout);
  const uid = useId();
  return (
    <div className="flex flex-col gap-5">
      <GroupTitle hint="How the Next, Back and Submit buttons look and read.">Buttons</GroupTitle>
      <TileGroup label="Button size" columns={3}>
        {BUTTON_SIZES.map((o) => (
          <LookTile key={o.value} label={o.label} chosen={size === o.value} onClick={() => setTheme('buttons', { size: o.value === 'default' ? undefined : o.value })}>
            <SampleButton branding={branding} h={o.h} px={o.px} fs={o.fs} />
          </LookTile>
        ))}
      </TileGroup>
      <TileGroup label="Button width" columns={2} hint="On a phone the buttons always share the row.">
        <LookTile label="Fill the row" chosen={width === 'fill'} onClick={() => setTheme('buttons', { width: undefined })}>
          <span className="flex w-full gap-1.5">
            <SampleButton branding={branding} text="Back" grow />
            <SampleButton branding={branding} text="Next" grow />
          </span>
        </LookTile>
        <LookTile label="As wide as the words" chosen={width === 'auto'} onClick={() => setTheme('buttons', { width: 'auto' })}>
          <span className="flex w-full justify-end gap-1.5">
            <SampleButton branding={branding} text="Back" px={8} />
            <SampleButton branding={branding} text="Next" px={8} />
          </span>
        </LookTile>
      </TileGroup>
      <TileGroup label="When the pointer is over a button" columns={3}>
        <LookTile label="Nothing" chosen={hover === 'none'} onClick={() => setTheme('buttons', { hover: undefined })}>
          <SampleButton branding={branding} />
        </LookTile>
        <LookTile label="Lift" chosen={hover === 'lift'} onClick={() => setTheme('buttons', { hover: 'lift' })}>
          <SampleButton branding={branding} lift />
        </LookTile>
        <LookTile label="Darken" chosen={hover === 'darken'} onClick={() => setTheme('buttons', { hover: 'darken' })}>
          <SampleButton branding={branding} dark />
        </LookTile>
      </TileGroup>

      <GroupTitle hint="Your own words. Leave a box empty to keep the usual word.">Button text</GroupTitle>
      <WordsInput id={`${uid}-submit`} label="Submit button" placeholder="Submit" max={LABEL_MAX} value={theme?.labels?.submit} onChange={(submit) => setTheme('labels', { submit })} />
      <WordsInput id={`${uid}-next`} label="Next button" placeholder="Next" max={LABEL_MAX} value={theme?.labels?.next} onChange={(next) => setTheme('labels', { next })} />
      <WordsInput id={`${uid}-back`} label="Back button" placeholder="Back" max={LABEL_MAX} value={theme?.labels?.back} onChange={(back) => setTheme('labels', { back })} />

      <GroupTitle hint="For forms with more than one page.">Progress</GroupTitle>
      <TileGroup label="Progress style" columns={3} hint={progressBlocked}>
        {PROGRESS_STYLES.map((o) => (
          <LookTile key={o.value} label={o.label} chosen={!progressBlocked && progress === o.value} disabled={!!progressBlocked} onClick={() => setTheme('progress', { style: o.value === 'bar' ? undefined : o.value })}>
            <ProgressSample style={o.value} />
          </LookTile>
        ))}
      </TileGroup>

      <GroupTitle hint="A short line under the form.">Footer note</GroupTitle>
      <Textarea
        id={`${uid}-footer`}
        label="Note"
        rows={2}
        showCount
        maxLength={FOOTER_MAX}
        value={theme?.footer?.note ?? ''}
        placeholder="e.g. Questions? Write to hello@example.com"
        onChange={(e) => setTheme('footer', { note: e.target.value.replace(/[<>]/g, '') || undefined })}
      />
    </div>
  );
}

// ── The page behind the form, and the cover's height ────────────────────────────────────────────────────────────────

/** A hex colour mixed toward the pale page grey, as the hex a default gradient end shows. */
function paleHex(hex: string, toward = '#F7F8FB', share = 0.65): string {
  const parse = (h: string) => {
    const v = h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
    return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
  };
  if (!HEX.test(hex)) return toward;
  const [a, b] = [parse(hex), parse(toward)];
  return `#${a.map((c, i) => Math.round(c * (1 - share) + b[i] * share).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/**
 * The page behind the form. A gradient takes the owner's two colours and the angle they fade at; a picture can be darkened (so a card or text on it reads)
 * and blurred (so it is a backdrop, not a distraction). Anything else has nothing more to set here.
 */
export function BackgroundLook({ branding, setTheme }: { branding: FormBranding; setTheme: SetTheme }) {
  const bg = branding.theme?.background;
  const style = branding.backgroundStyle ?? 'wash';
  const base = branding.backgroundColor ?? branding.primaryColor ?? DEFAULT.brand;
  if (style === 'gradient') {
    return (
      <div className="flex flex-col gap-4">
        <GroupTitle hint="Your own two colours, and the direction they fade in.">Gradient</GroupTitle>
        <div className="grid grid-cols-2 gap-3">
          <ColourRow label="From" value={bg?.from} fallback={base} onPick={(from) => setTheme('background', { from })} onReset={() => setTheme('background', { from: undefined })} />
          <ColourRow label="To" value={bg?.to} fallback={paleHex(bg?.from ?? base)} onPick={(to) => setTheme('background', { to })} onReset={() => setTheme('background', { to: undefined })} />
        </div>
        <Slider label="Angle" value={bg?.angle} preset={135} min={0} max={360} step={15} unit="°" onChange={(angle) => setTheme('background', { angle })} onReset={() => setTheme('background', { angle: undefined })} />
      </div>
    );
  }
  if (style === 'image' && branding.backgroundImageUrl) {
    return (
      <div className="flex flex-col gap-4">
        <GroupTitle hint="Make the picture calmer, so the form on top is easy to read.">Over the picture</GroupTitle>
        <Slider label="Darken" value={bg?.darken} preset={0} min={0} max={80} step={5} unit="%" onChange={(darken) => setTheme('background', { darken })} onReset={() => setTheme('background', { darken: undefined })} />
        <Slider label="Blur" value={bg?.blur} preset={0} min={0} max={20} step={1} unit="px" onChange={(blur) => setTheme('background', { blur })} onReset={() => setTheme('background', { blur: undefined })} />
      </div>
    );
  }
  return null;
}

/** How tall the cover banner is, from a slim strip to a tall header. */
export function CoverHeight({ branding, setTheme }: { branding: FormBranding; setTheme: SetTheme }) {
  return (
    <Slider
      label="Banner height"
      value={branding.theme?.cover?.height}
      preset={176}
      min={120}
      max={480}
      step={10}
      unit="px"
      onChange={(height) => setTheme('cover', { height })}
      onReset={() => setTheme('cover', { height: undefined })}
    />
  );
}
