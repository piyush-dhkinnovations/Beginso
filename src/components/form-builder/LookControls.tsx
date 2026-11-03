'use client';

import { useId, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, ChevronDown, RotateCcw } from 'lucide-react';
import { contrastRatio, fixContrast, TEXT_CONTRAST } from '@/lib/contrast';
import { brandLookProps, themeOptionBlocked, type ThemeOption } from '@/lib/formTheme';
import { bx } from '@/lib/utils';
import type { ChoiceStyle, FieldStyle, FormBranding, FormTheme, LabelPosition, LayoutPreset } from '@/types/form';

// The groups of controls the branding studio has for the form's colours, how its fields look, and exact sizes. Each choice is drawn (a tile that
// looks like what it does), "Default" is one click away, and an option the chosen layout cannot show is switched off with the reason, never ignored.

export type ThemeGroup = 'colors' | 'fields' | 'card' | 'layout' | 'fonts';
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

/** One colour: a swatch that opens the picker, the hex, and a reset to the default. */
function ColourRow({ label, value, fallback, onPick, onReset }: { label: string; value?: string; fallback: string; onPick: (c: string) => void; onReset: () => void }) {
  const id = useId();
  const [typed, setTyped] = useState<string | null>(null);
  const commit = () => {
    if (typed !== null && HEX.test(typed.trim())) onPick(typed.trim());
    setTyped(null);
  };
  return (
    <div className="flex items-center gap-2">
      <label className="relative size-9 shrink-0 cursor-pointer" aria-label={`${label} colour`}>
        <span aria-hidden="true" className="block size-9 rounded-md border border-(--border-strong)" style={{ backgroundColor: value ?? fallback }} />
        <input type="color" value={six(value ?? fallback)} onChange={(e) => onPick(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </label>
      <label htmlFor={id} className="min-w-0 flex-1 bg-body-sm font-medium text-(--text-primary)">
        {label}
      </label>
      <input
        id={id}
        value={typed ?? value ?? ''}
        placeholder="Default"
        maxLength={7}
        spellCheck={false}
        onChange={(e) => setTyped(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="h-9 w-24 rounded-md border border-(--border-default) bg-(--surface-card) px-2 font-mono text-sm text-(--text-primary) placeholder:font-sans placeholder:text-(--text-muted) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
      />
      <button
        type="button"
        onClick={() => {
          setTyped(null);
          onReset();
        }}
        disabled={!value}
        aria-label={`Set ${label.toLowerCase()} back to the default`}
        title="Back to the default"
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-(--border-focus)"
      >
        <RotateCcw size={14} aria-hidden="true" />
      </button>
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

/** Each pair with its ratio, and a one-tap Fix for a failing one. */
function Readability({ branding, setTheme, onBrand }: { branding: FormBranding; setTheme: SetTheme; onBrand: (colour: string) => void }) {
  const checks = readabilityChecks(branding);
  return (
    <div className="flex flex-col gap-1.5" role="list" aria-label="Readability of the colours">
      <span className="bg-label">Readability</span>
      {checks.map((k) => {
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
  );
}

/** Text, headings, card, fields, field border and button text, each on one line, then the readability of the pairs. */
export function FormColours({ branding, setTheme, onBrand }: { branding: FormBranding; setTheme: SetTheme; onBrand: (colour: string) => void }) {
  const colours = branding.theme?.colors ?? {};
  const any = COLOURS.some((c) => colours[c.key]);
  return (
    <div className="flex flex-col gap-3">
      <GroupTitle hint="Leave one as Default and it follows the look you picked.">Form colours</GroupTitle>
      {COLOURS.map((c) => (
        <ColourRow key={c.key} label={c.label} value={colours[c.key]} fallback={DEFAULT[c.key]} onPick={(v) => setTheme('colors', { [c.key]: v })} onReset={() => setTheme('colors', { [c.key]: undefined })} />
      ))}
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
      <GroupTitle hint="How the boxes people type in look.">Fields</GroupTitle>
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

function Slider({ label, value, preset, min, max, step = 1, unit = 'px', onChange, onReset }: SliderProps) {
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
  const touched = [t?.card?.radius, t?.card?.shadow, t?.layout?.maxWidth, t?.layout?.fieldGap, t?.fields?.radius].some((v) => v !== undefined);
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
          {cornersBlocked ? (
            <p className="bg-caption text-(--text-muted)">Field corners: {cornersBlocked}</p>
          ) : (
            <Slider label="Field corners" value={t?.fields?.radius} preset={10} min={0} max={32} onChange={(radius) => setTheme('fields', { radius })} onReset={() => setTheme('fields', { radius: undefined })} />
          )}
          <p className="bg-caption text-(--text-muted)">The form width is a biggest width: on a small screen the form still fits the screen.</p>
          {touched && (
            <button type="button" onClick={() => { setTheme('card', { radius: undefined, shadow: undefined }); setTheme('layout', { maxWidth: undefined, fieldGap: undefined }); setTheme('fields', { radius: undefined }); }} className="self-start rounded-md bg-body-sm text-(--text-muted) underline underline-offset-2 hover:text-(--text-secondary)">
              Back to the presets
            </button>
          )}
        </div>
      )}
    </div>
  );
}
