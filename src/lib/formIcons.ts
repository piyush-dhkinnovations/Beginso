import { FORM_ICON_DATA } from './formIconData.generated';

// A form's own icon, for forms that have no uploaded logo: a name from this set. The illustrations are Streamline's "Ultimate Color"
// free icon set (npm @iconify-json/streamline-ultimate-color, CC BY 4.0, https://streamlinehq.com), a curated subset of it generated
// into formIconData.generated.ts by scripts/generateFormIcons.mjs (edit scripts/formIconSet.json to change the list). The stored value
// is the icon's kebab-case name (a slug, validated on the server as such), never markup: it only ever selects an entry from this table.
export interface FormIconDef {
  name: string;
  label: string;
  /** Extra search words, so "money" finds a wallet and "kids" finds a game. */
  keywords: string;
  /** A representative hue of the illustration; used where a single colour is needed (avatars). */
  color: string;
  /** SVG inner markup on a 24x24 canvas (static, from the generated data). */
  body: string;
}

/** The credit the licence (CC BY 4.0) asks for. Shown wherever the icons are offered. */
export const ICON_CREDIT = { text: 'Icons by Streamline (Ultimate Color, CC BY 4.0)', url: 'https://streamlinehq.com' } as const;

export const FORM_ICONS: FormIconDef[] = FORM_ICON_DATA.map(({ name, label, keywords, color, body }) => ({ name, label, keywords, color, body }));

const BY_NAME = new Map(FORM_ICONS.map((i) => [i.name, i]));
export const getFormIcon = (name: string | null | undefined): FormIconDef | undefined => (name ? BY_NAME.get(name) : undefined);

/** The icons offered up front in the picker (the rest sit behind "More icons"): the ones most forms are about. */
export const FEATURED_ICON_NAMES: string[] = FORM_ICON_DATA.filter((i) => i.featured).map((i) => i.name);

const DEFAULT_ICON = 'common-file-text';

// What a form's name says it is about, in order: the first match wins. A name that matches nothing gets the plain document icon.
const SUGGESTIONS: [RegExp, string][] = [
  // Specific subjects first, so "Trip planner" is a trip (not a "plan") and "Volunteer sign-up" is people (not a "sign-up").
  [/health|patient|medical|clinic/i, 'monitor-heart-beat'],
  [/travel|trip|flight|holiday/i, 'style-one-pin-plane'],
  [/food|restaurant|menu|catering/i, 'fast-food-french-fries'],
  [/team|member|volunteer|join|community/i, 'multiple-users-1'],
  [/feedback|survey|review|rating|nps/i, 'rating-star'],
  [/event|registration|rsvp|webinar|conference/i, 'calendar-1'],
  [/job|application|hiring|career|recruit|resume|hr\b/i, 'cash-briefcase'],
  [/order|product|shop|purchase|sales|cart|store/i, 'shopping-cart-full'],
  [/contact|enquiry|inquiry|reach/i, 'phone-actions-call'],
  [/pitch|plan|proposal|business|idea|strategy/i, 'idea-strategy'],
  [/quiz|test|exam|assessment|score/i, 'notes-checklist-flip'],
  [/payment|invoice|billing|donation|fee/i, 'credit-card-1'],
  [/student|course|school|class|learn|training/i, 'single-woman-book'],
  [/booking|appointment|schedule|reservation/i, 'calendar-date'],
  [/newsletter|subscribe|signup|sign-up|mailing/i, 'send-email-fly'],
  [/support|ticket|help|issue|bug|request/i, 'headphones-customer-support-question'],
  [/comment|message|chat|opinion/i, 'messages-bubble-text'],
];

/** The icon that suits a form's name. Used as the first choice in the picker and for forms that never set one. */
export function suggestFormIcon(title: string | null | undefined): FormIconDef {
  const text = title ?? '';
  const hit = SUGGESTIONS.find(([re]) => re.test(text));
  return (hit && getFormIcon(hit[1])) || (BY_NAME.get(DEFAULT_ICON) as FormIconDef);
}

/** Icons matching a search, by name, label or keywords; an empty search returns them all. */
export function searchFormIcons(query: string): FormIconDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return FORM_ICONS;
  return FORM_ICONS.filter((i) => `${i.name} ${i.label} ${i.keywords}`.toLowerCase().includes(q));
}
