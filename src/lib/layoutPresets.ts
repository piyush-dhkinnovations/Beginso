import type { CardStyle, FormBranding, FormFont, LayoutPreset, PageBackground, PanelTreatment } from '@/types/form';

// Sprint 13 (CF2.7), requirements.md 2.1–2.3. The six presets and the ONE mapper from a stored
// layout value to a preset — builder, preview and public form all import normaliseLayout(); nothing
// else may interpret `settings.layout`. Legacy mapping is OQ-2's default: single_column → classic,
// two_column and compact → compact. Unknown/missing → classic, never an error.
//
// All copy below is taken from the V2 wireframe's FORM_LAYOUTS (Beginso V2/wireframes/index.html),
// which was reviewed once already — do not reword it here.

export interface LayoutPresetInfo {
  id: LayoutPreset;
  name: string;
  tagline: string;
  /** Short "best for" label shown as the card badge, e.g. "1–5 fields". */
  best: string;
  use: string;
  mobile: string;
  a11y: string;
  watch: string;
  internalOnly?: boolean;
}

/** The starting look each preset ships with — a distinct colour, typeface, card style and panel, so the six read as six designs. */
export interface LayoutLook {
  color: string;
  font: FormFont;
  cardStyle: CardStyle;
  panel: PanelTreatment;
  /** The page behind the card. */
  background: PageBackground;
}

export const LAYOUT_LOOKS: Record<LayoutPreset, LayoutLook> = {
  classic: { color: '#1D4ED8', font: 'dm_sans', cardStyle: 'soft', panel: 'solid', background: 'wash' },
  card_stack: { color: '#0F766E', font: 'inter', cardStyle: 'bordered', panel: 'solid', background: 'grid' },
  guided: { color: '#7C3AED', font: 'nunito', cardStyle: 'elevated', panel: 'gradient', background: 'mesh' },
  steps: { color: '#EA580C', font: 'work_sans', cardStyle: 'soft', panel: 'pattern', background: 'dots' },
  split_feature: { color: '#BE185D', font: 'lora', cardStyle: 'elevated', panel: 'gradient', background: 'gradient' },
  compact: { color: '#475569', font: 'inter', cardStyle: 'flat', panel: 'solid', background: 'plain' },
  chat: { color: '#0369A1', font: 'quicksand', cardStyle: 'soft', panel: 'solid', background: 'wash' },
  sidebar: { color: '#4338CA', font: 'plus_jakarta_sans', cardStyle: 'bordered', panel: 'solid', background: 'plain' },
  open: { color: '#111827', font: 'source_serif_4', cardStyle: 'flat', panel: 'solid', background: 'plain' },
  focus: { color: '#BE185D', font: 'outfit', cardStyle: 'flat', panel: 'solid', background: 'plain' },
};

/** Branding changes for "Use this layout": font, card and panel always follow the preset; the colour only when the owner has not picked their own (`showcase`, used by the gallery preview, always swaps it so each layout reads as its own design). */
export function lookBranding(layout: LayoutPreset, current: FormBranding, showcase = false, from?: LayoutPreset): Partial<FormBranding> {
  const look = LAYOUT_LOOKS[layout];
  // Switching layout (`from` is the layout the form has now) must not undo a design the owner has made: a font, card, panel or page background they
  // changed from the current layout's own is kept. One they have not touched still follows the new layout, so a fresh form gets the whole look.
  if (from) {
    const was = LAYOUT_LOOKS[from];
    const untouched = <T,>(value: T | undefined, preset: T) => value === undefined || value === preset;
    const background = untouched(current.backgroundStyle, was.background);
    return {
      ...(untouched(current.fontFamily, was.font) ? { fontFamily: look.font } : {}),
      ...(untouched(current.cardStyle, was.cardStyle) ? { cardStyle: look.cardStyle } : {}),
      ...(untouched(current.panelTreatment, was.panel) ? { panelTreatment: look.panel } : {}),
      ...(background ? { backgroundStyle: look.background, backgroundColor: undefined } : {}),
      ...(untouched(current.primaryColor, was.color) || !current.primaryColor ? { primaryColor: look.color } : {}),
    };
  }
  const ownColour = !!current.primaryColor && current.primaryColor.toUpperCase() !== '#1D4ED8' && !Object.values(LAYOUT_LOOKS).some((l) => l.color === current.primaryColor);
  return {
    fontFamily: look.font,
    cardStyle: look.cardStyle,
    panelTreatment: look.panel,
    backgroundStyle: look.background,
    backgroundColor: undefined, // built from the brand colour
    ...(ownColour && !showcase ? {} : { primaryColor: look.color }),
  };
}

export const LAYOUT_PRESETS: readonly LayoutPresetInfo[] = [
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'One column, everything on one page',
    best: '1–5 fields',
    use: 'Contact forms, quick feedback, RSVPs. The safest default and the fastest to complete.',
    mobile: 'Already one column — nothing reflows. Identical on every screen.',
    a11y: 'Top-aligned labels, natural tab order, no hidden fields.',
    watch: 'Past about 6 fields the page starts to feel long and drop-off climbs.',
  },
  {
    id: 'card_stack',
    name: 'Card Stack',
    tagline: 'Grouped sections, each in its own card',
    best: '6–15 fields in 2–4 groups',
    use: 'Job applications, order forms, anything with natural sections like “About you” then “Your project”.',
    mobile: 'Cards go full-bleed and padding tightens; still one column.',
    a11y: 'Each card is a <fieldset> with a <legend>, so screen readers announce the group.',
    watch: 'Only worth it if your groups are real. Arbitrary grouping confuses people.',
  },
  {
    id: 'guided',
    name: 'Guided',
    tagline: 'One question at a time, full screen',
    best: '5–20 short questions',
    use: 'Surveys, quizzes, NPS. Isolating each question lowers perceived effort on long forms.',
    mobile: 'Best-performing layout on phones — one question always fits without scrolling.',
    a11y: 'Needs a visible question counter and working Back; keyboard Enter advances.',
    watch: 'Respondents cannot scan ahead or review answers, so add a summary step before submit.',
  },
  {
    id: 'steps',
    name: 'Steps',
    tagline: 'Multi-step wizard with a named progress bar',
    best: '6+ fields, or qualification flows',
    use: 'Longer applications and onboarding. Multi-page forms average roughly 13.9% completion against 4.5% for a single long page.',
    mobile: 'Step labels collapse to “Step 2 of 4”; the bar stays pinned to the top.',
    a11y: 'Progress must be announced on change; Back must never wipe entered data.',
    watch: 'Name your steps. A bare percentage tells the respondent nothing about what is left.',
  },
  {
    id: 'split_feature',
    name: 'Split Feature',
    tagline: 'Brand panel beside the form',
    best: '1–8 fields',
    use: 'Public-facing lead capture where context, a logo or a testimonial has to sit next to the fields.',
    mobile: 'Panel collapses to a short header above the form, or hides entirely below 480px.',
    a11y: 'Panel is decorative — it must come after the form in DOM order.',
    watch: 'The panel eats half the viewport on tablets. Keep the copy to one line.',
  },
  {
    id: 'compact',
    name: 'Compact',
    tagline: 'Two columns for short related fields',
    best: '10+ fields, internal users',
    use: 'Staff-facing intake and admin forms where speed matters more than conversion and the audience is trained.',
    mobile: 'Forced to a single column below 768px — two columns never render on a phone.',
    a11y: 'Tab order follows rows, not columns, which trips screen-reader users.',
    watch: 'Measurably slower and more error-prone for the public. Do not use on a public form.',
    internalOnly: true,
  },
  {
    id: 'chat',
    name: 'Chat',
    tagline: 'Questions asked like messages, one at a time',
    best: '4–15 short questions',
    use: 'Friendly surveys, onboarding and feedback where a conversation feels lighter than a form.',
    mobile: 'Reads like a message thread; the avatar dot hides on the smallest screens.',
    a11y: 'Same one-question flow as Guided: a visible question counter, a working Back, Enter goes on.',
    watch: 'Not for long, dense answers; respondents cannot scan ahead. Keep each question short.',
  },
  {
    id: 'sidebar',
    name: 'Sidebar',
    tagline: 'A step list down the side, the form beside it',
    best: '6+ fields in 3–6 named pages',
    use: 'Applications and onboarding where seeing every step and where you are builds trust.',
    mobile: 'The list collapses to one line above the form: “Step 2 of 4 · Your details”.',
    a11y: 'The list is a labelled navigation with the current step marked, and the change is announced.',
    watch: 'Name every page. A list of “Step 1, Step 2” tells the respondent nothing.',
  },
  {
    id: 'open',
    name: 'Open',
    tagline: 'No card: the form sits right on the page',
    best: '1–10 fields',
    use: 'Light, modern forms and embeds where a box around the form would feel heavy.',
    mobile: 'Same single column; the page colour runs edge to edge.',
    a11y: 'The text sits on the page colour, so pick a plain or soft page (the readability list checks it).',
    watch: 'A busy picture or pattern behind the questions makes them hard to read.',
  },
  {
    id: 'focus',
    name: 'Focus',
    tagline: 'One big question at a time, full screen, no card',
    best: '3–12 questions',
    use: 'Quizzes, NPS and sign-ups where each question deserves the whole screen.',
    mobile: 'The question fills the screen with the answer under it.',
    a11y: 'A thin progress line and a visible question counter; Back always works.',
    watch: 'Respondents cannot scan ahead. Add a clear last question and keep it short.',
  },
];

const PRESET_IDS = new Set<string>(LAYOUT_PRESETS.map((p) => p.id));

export function normaliseLayout(value?: string | null): LayoutPreset {
  if (!value) return 'classic';
  if (PRESET_IDS.has(value)) return value as LayoutPreset;
  if (value === 'two_column') return 'compact';
  return 'classic'; // 'single_column' and anything unknown
}

/**
 * The wireframe's field-count nudge above the gallery ("Your form currently has 7 fields. At that
 * length, Steps or Card Stack usually outperform a single long page."). Returns null when no nudge is
 * warranted so the callout is simply not rendered.
 */
export function layoutRecommendation(fieldCount: number): string | null {
  if (fieldCount === 0) return null;
  if (fieldCount <= 5) return 'At that length, Classic is the safest and fastest to complete.';
  return 'At that length, Steps or Card Stack usually outperform a single long page.';
}
