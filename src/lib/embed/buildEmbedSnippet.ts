import type { FormField, FormPage } from '@/types/form';

// ONE source of truth for the Share & Embed screen: the same buildSnippet()/buildFormUrl()/buildAdvancedRows()
// feed the code block, the live preview and the Advanced list, so no control can be decorative.

export type EmbedMethod = 'fixed' | 'auto' | 'popup' | 'drawer' | 'link';
export type EmbedTheme = 'light' | 'dark' | 'auto';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface PrefillRow {
  id: string;
  key: string;
  value: string;
}

export interface EmbedConfig {
  method: EmbedMethod;
  widthValue: number;
  widthUnit: 'px' | '%';
  height: number;
  border: boolean;
  rounded: boolean;
  buttonText: string;
  buttonColor: string;
  buttonSize: ButtonSize;
  modalWidth: number;
  side: 'left' | 'right';
  drawerWidth: number;
  cover: boolean;
  background: boolean;
  progress: boolean;
  hideTitle: boolean;
  theme: EmbedTheme;
  prefill: PrefillRow[];
}

export const DEFAULT_EMBED_CONFIG: EmbedConfig = {
  method: 'auto',
  widthValue: 100,
  widthUnit: '%',
  height: 600,
  border: false,
  rounded: true,
  buttonText: 'Open form',
  buttonColor: '#1D4ED8',
  buttonSize: 'medium',
  modalWidth: 640,
  side: 'right',
  drawerWidth: 480,
  cover: true,
  background: true,
  progress: true,
  hideTitle: false,
  theme: 'light',
  prefill: [],
};

export const EMBED_METHODS: { id: EmbedMethod; name: string; summary: string; whenToUse: string }[] = [
  { id: 'auto', name: 'Inline, auto-height', summary: 'Sits in your page and grows with the form.', whenToUse: 'Best for most sites: multi-page forms, conditional fields and error messages never get cut off.' },
  { id: 'fixed', name: 'Inline, fixed size', summary: 'A plain iframe at the width and height you set.', whenToUse: 'Use when you cannot run a script, or must control the exact box (some page builders and email tools).' },
  { id: 'popup', name: 'Popup', summary: 'A button opens the form in a centred modal.', whenToUse: 'Use for a call to action ("Contact us", "Book a demo") without giving the form page space.' },
  { id: 'drawer', name: 'Slide-over drawer', summary: 'A button slides the form in from the left or right.', whenToUse: 'Use for longer forms where the visitor should still see your page behind it.' },
  { id: 'link', name: 'Full-page link', summary: "Just the form's public URL, with a QR code.", whenToUse: 'Use in emails, chats, social posts and print. Nothing to install.' },
];

export const LIMITS = {
  widthPx: [200, 2000],
  widthPct: [10, 100],
  height: [200, 5000],
  modal: [320, 1200],
  drawer: [280, 900],
  buttonText: 60,
  prefillRows: 20,
} as const;

const clamp = (n: number, range: readonly number[]) => Math.min(range[1], Math.max(range[0], Math.round(Number.isFinite(n) ? n : range[0])));
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Every number/colour/text is forced into a safe range here, so a half-typed control can never emit broken HTML. */
export function normalizeConfig(c: EmbedConfig): EmbedConfig {
  return {
    ...c,
    widthValue: clamp(c.widthValue, c.widthUnit === '%' ? LIMITS.widthPct : LIMITS.widthPx),
    height: clamp(c.height, LIMITS.height),
    modalWidth: clamp(c.modalWidth, LIMITS.modal),
    drawerWidth: clamp(c.drawerWidth, LIMITS.drawer),
    buttonText: c.buttonText.replace(/[\r\n]+/g, ' ').trim().slice(0, LIMITS.buttonText) || 'Open form',
    buttonColor: HEX.test(c.buttonColor) ? c.buttonColor : DEFAULT_EMBED_CONFIG.buttonColor,
  };
}

export interface EmbedContext {
  /** App origin, no trailing slash. */
  origin: string;
  slug: string;
  formTitle: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const enc = encodeURIComponent;

/** The ordered query pairs. Branding is deliberately absent: see ShareView (no capability exists to gate it). */
export function buildParamPairs(raw: EmbedConfig): [string, string][] {
  const c = normalizeConfig(raw);
  const pairs: [string, string][] = [
    ['embed', '1'],
    ['cover', c.cover ? '1' : '0'],
    ['bg', c.background ? '1' : '0'],
    ['progress', c.progress ? '1' : '0'],
    ['title', c.hideTitle ? '1' : '0'],
    ['theme', c.theme],
  ];
  for (const r of c.prefill.slice(0, LIMITS.prefillRows)) {
    const key = r.key.trim();
    if (key && r.value.trim()) pairs.push([`prefill[${key}]`, r.value]);
  }
  return pairs;
}

/** Brackets stay literal for readability; key and value are URL-encoded. */
export function buildQuery(c: EmbedConfig): string {
  return buildParamPairs(c)
    .map(([k, v]) => {
      const m = /^prefill\[(.*)\]$/.exec(k);
      return m ? `prefill[${enc(m[1])}]=${enc(v)}` : `${k}=${enc(v)}`;
    })
    .join('&');
}

export const publicUrl = (ctx: EmbedContext) => `${ctx.origin}/f/${ctx.slug}`;
export const buildFormUrl = (ctx: EmbedContext, c: EmbedConfig) => `${publicUrl(ctx)}?${buildQuery(c)}`;
export const scriptUrl = (ctx: EmbedContext) => `${ctx.origin}/embed.js`;

function textOn(hex: string): string {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#111827' : '#FFFFFF';
}

const SIZES: Record<ButtonSize, { pad: string; font: number }> = {
  small: { pad: '6px 12px', font: 13 },
  medium: { pad: '10px 18px', font: 15 },
  large: { pad: '14px 26px', font: 17 },
};

export function buttonStyle(c: EmbedConfig): string {
  const n = normalizeConfig(c);
  const s = SIZES[n.buttonSize];
  return `background:${n.buttonColor};color:${textOn(n.buttonColor)};border:0;border-radius:8px;padding:${s.pad};font:600 ${s.font}px/1.2 system-ui,sans-serif;cursor:pointer`;
}

const frameStyle = (c: EmbedConfig) => `border:${c.border ? '1px solid #D0D5DD' : '0'};border-radius:${c.rounded ? '8px' : '0'};max-width:100%`;

export function buildSnippet(ctx: EmbedContext, raw: EmbedConfig): string {
  const c = normalizeConfig(raw);
  const url = publicUrl(ctx);
  const title = esc(ctx.formTitle || 'Form');
  const q = esc(buildQuery(c));
  const script = `<script src="${esc(scriptUrl(ctx))}" async></script>`;
  const slug = esc(ctx.slug);
  const width = `${c.widthValue}${c.widthUnit}`;
  switch (c.method) {
    case 'link':
      return url;
    case 'fixed':
      return [
        `<iframe`,
        `  src="${esc(buildFormUrl(ctx, c))}"`,
        `  title="${title}"`,
        `  width="${c.widthUnit === '%' ? width : c.widthValue}" height="${c.height}"`,
        `  loading="lazy"`,
        `  style="${frameStyle(c)}">`,
        `  <a href="${esc(url)}">${title}</a>`,
        `</iframe>`,
      ].join('\n');
    case 'auto':
      return [
        `<div data-beginso-form="${slug}" data-beginso-params="${q}" data-beginso-title="${title}"`,
        `     data-beginso-width="${width}" data-beginso-border="${c.border ? 1 : 0}" data-beginso-rounded="${c.rounded ? 1 : 0}">`,
        `  <a href="${esc(url)}">${title}</a>`,
        `</div>`,
        script,
      ].join('\n');
    case 'popup':
    case 'drawer': {
      const attr = triggerAttrs(ctx, c);
      return [
        `<button type="button"`,
        ...attr.map(([k, v]) => `        ${k}="${esc(v)}"`),
        `        style="${buttonStyle(c)}">${esc(c.buttonText)}</button>`,
        `<noscript><style>[${attr[0][0]}="${slug}"]{display:none}</style><a href="${esc(url)}">${esc(c.buttonText)}</a></noscript>`,
        script,
      ].join('\n');
    }
  }
}

/** Data attributes of the popup/drawer button, in snippet order. The live preview renders exactly these. */
export function triggerAttrs(ctx: EmbedContext, raw: EmbedConfig, extraQuery = ''): [string, string][] {
  const c = normalizeConfig(raw);
  const popup = c.method === 'popup';
  const q = buildQuery(c) + extraQuery;
  const attrs: [string, string][] = [
    [popup ? 'data-beginso-popup' : 'data-beginso-drawer', ctx.slug],
    ['data-beginso-params', q],
    ['data-beginso-title', ctx.formTitle || 'Form'],
  ];
  if (!popup) attrs.push(['data-beginso-side', c.side]);
  attrs.push(['data-beginso-width', String(popup ? c.modalWidth : c.drawerWidth)]);
  return attrs;
}

export interface AdvancedRow {
  name: string;
  value: string;
  fallback: string;
  description: string;
  kind: 'URL parameter' | 'Script attribute';
}

/** The raw parameter list for the selected method: each row is what a control above maps to. */
export function buildAdvancedRows(raw: EmbedConfig): AdvancedRow[] {
  const c = normalizeConfig(raw);
  const urlRow = (name: string, value: string, fallback: string, description: string): AdvancedRow => ({ name, value, fallback, description, kind: 'URL parameter' });
  const attrRow = (name: string, value: string, fallback: string, description: string): AdvancedRow => ({ name, value, fallback, description, kind: 'Script attribute' });
  if (c.method === 'link') return [];
  const rows: AdvancedRow[] = [
    urlRow('embed', '1', '0', 'Renders the form chrome-less and reports its height to the page that embeds it.'),
    urlRow('cover', c.cover ? '1' : '0', '1', '1 shows the cover banner and logo, 0 hides them.'),
    urlRow('bg', c.background ? '1' : '0', '1', '1 keeps the page background behind the form card, 0 removes it so your page shows through.'),
    urlRow('progress', c.progress ? '1' : '0', '1', '1 shows page progress, 0 hides it.'),
    urlRow('title', c.hideTitle ? '1' : '0', '0', '1 hides the form title (kept for screen readers), 0 shows it.'),
    urlRow('theme', c.theme, 'light', 'light, dark, or auto (follows the colour scheme of the page that embeds the form).'),
  ];
  for (const [k, v] of buildParamPairs(c).filter(([name]) => name.startsWith('prefill['))) {
    rows.push(urlRow(k, v, '(none)', 'Pre-fills the matching field on load. Never submitted automatically.'));
  }
  if (c.method === 'fixed') {
    rows.push(attrRow('width / height', `${c.widthValue}${c.widthUnit} / ${c.height}px`, '-', 'Plain iframe attributes.'));
    rows.push(attrRow('style', frameStyle(c), '-', 'Border on/off and rounded corners.'));
  }
  if (c.method === 'auto') {
    rows.push(attrRow('data-beginso-width', `${c.widthValue}${c.widthUnit}`, '100%', 'Width of the frame (never wider than its container).'));
    rows.push(attrRow('data-beginso-border', c.border ? '1' : '0', '0', '1 draws a 1px border.'));
    rows.push(attrRow('data-beginso-rounded', c.rounded ? '1' : '0', '1', '1 rounds the corners.'));
  }
  if (c.method === 'popup' || c.method === 'drawer') {
    rows.push(attrRow('data-beginso-width', String(c.method === 'popup' ? c.modalWidth : c.drawerWidth), '-', `${c.method === 'popup' ? 'Modal' : 'Drawer'} width in px (never wider than the screen).`));
    rows.push(attrRow('style', buttonStyle(c), '-', 'Button colour, size and text colour; the button text is the element content.'));
    if (c.method === 'drawer') rows.push(attrRow('data-beginso-side', c.side, 'right', 'Edge the drawer slides in from.'));
  }
  rows.push(attrRow('data-beginso-params', buildQuery(c), '-', 'The URL parameters above, applied by the script to the form address.'));
  return rows;
}

/** Rough height (px) of the tallest page, for the "frame is too short" warning. The live preview's measured height wins when larger. */
export function estimateFormHeight(fields: FormField[], pages: FormPage[], c: Pick<EmbedConfig, 'cover' | 'progress'>): number {
  const live = fields.filter((f) => !f.deleted);
  const perField = (f: FormField) => (f.type === 'long_text' ? 150 : f.type === 'file_upload' ? 120 : f.type === 'multiple_choice' || f.type === 'checkbox' ? 56 + 38 * f.options.length : 92);
  const tallest = Math.max(0, ...pages.map((p) => live.filter((f) => f.pageId === p.id).reduce((n, f) => n + perField(f) + 20, 0) + (p.description ? 28 : 0)));
  return Math.round(32 + 56 + tallest + 72 + (c.cover ? 168 : 0) + (c.progress && pages.length > 1 ? 32 : 0));
}
