/**
 * Shared TypeScript interfaces for the Form Builder.
 * These types are shared between the builder store, API service, and components.
 */

// Field Types

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'multiple_choice'
  | 'checkbox'
  | 'file_upload'
  | 'rating'
  | 'yes_no'
  | 'url'
  | 'time'
  | 'datetime'
  | 'currency'
  | 'address'
  | 'signature'
  | 'image_upload';

// Field Definitions

export interface BaseField {
  /** Public form only: the owner is out of storage, so this upload field is switched off (and never required). */
  uploadsDisabled?: boolean;
  fieldId: string;       // UUID — immutable once created; assigned via crypto.randomUUID()
  pageId: string;        // FormPage.id this field belongs to — always present (see FormPage below)
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  helpText?: string;
  deleted: boolean;      // soft-delete flag — never remove from array
  order: number;         // position within its page (not global across all pages)
  logicRules?: LogicRule[]; // rules where THIS field is the source
}

// Field constraint interfaces

export interface NumberConstraints {
  min?: number;
  max?: number;
}

export interface TextConstraints {
  maxLength?: number;
}

export interface DateConstraints {
  minDate?: string;      // ISO 8601 date string
  maxDate?: string;      // ISO 8601 date string
}

export interface TextField extends BaseField, NumberConstraints, TextConstraints, DateConstraints {
  type: 'short_text' | 'long_text' | 'email' | 'phone' | 'number' | 'date';
}

export interface ChoiceField extends BaseField {
  type: 'dropdown' | 'multiple_choice' | 'checkbox';
  options: string[];     // min 1 option required before save/publish
}

// The builder has no UI to set these, but seeded/imported templates can still carry a per-field maxFileSize or
// allowedMimeTypes (the backend enforces both regardless — see form.controller.ts's public submit handler), so the
// client validates against them too rather than only the platform-wide default in lib/validateFile.ts.
export interface FileUploadField extends BaseField {
  type: 'file_upload';
  maxFileSize?: number;        // MB; falls back to the platform default when unset
  allowedMimeTypes?: string[]; // falls back to the platform default list when unset/empty
}

// V2 field types
// Display & preview preferences live on the field itself, so a response is rendered the same way
// everywhere it is shown (response drawer, full-page view) and for every response, old or new.

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';
export type ImagePreviewPosition = 'top' | 'inline';
export type ImageAspectRatio = 'original' | '16:9' | '1:1';
export type ImagePreviewSize = 'small' | 'medium' | 'large';
export type UrlPreviewStyle = 'rich' | 'compact' | 'text';
export type UrlDisplay = 'card' | 'inline';

/** Fields with no settings beyond the common ones. */
export interface SimpleField extends BaseField {
  type: 'rating' | 'time' | 'datetime' | 'address' | 'signature';
}

/** A Yes / No question. The words on the two buttons can be changed; the answer stored is still "Yes" or "No". */
export interface YesNoField extends BaseField {
  type: 'yes_no';
  yesLabel?: string; // default "Yes"
  noLabel?: string;  // default "No"
}

export interface CurrencyField extends BaseField, NumberConstraints {
  type: 'currency';
  currency?: CurrencyCode; // default 'INR'
}

export interface UrlField extends BaseField {
  type: 'url';
  urlPreviewStyle?: UrlPreviewStyle; // default 'rich'
  urlDisplay?: UrlDisplay;           // default 'card'
  urlPreviewPosition?: ImagePreviewPosition; // default 'inline' (older forms keep their layout)
  urlAspectRatio?: ImageAspectRatio;         // default 'original'; rich preview only
  urlPreviewSize?: ImagePreviewSize;         // default 'medium'; rich preview only
}

export interface ImageUploadField extends BaseField {
  type: 'image_upload';
  maxFileSize?: number;                 // MB per image; the backend defaults to 10
  allowMultiple?: boolean;              // default false
  maxImages?: number;                   // 2 | 5 | 10 — only used when allowMultiple
  previewPosition?: ImagePreviewPosition; // default 'top'
  aspectRatio?: ImageAspectRatio;       // default 'original'
  previewSize?: ImagePreviewSize;       // default 'large'
}

export type FormField = TextField | ChoiceField | FileUploadField | SimpleField | YesNoField | CurrencyField | UrlField | ImageUploadField;

// Pages (multi-page / multi-step forms)
// Every form has at least one page, even simple single-page forms — a page is
// not an opt-in feature, it's the always-present unit fields belong to.

export interface FormPage {
  id: string;    // UUID — immutable once created; assigned via crypto.randomUUID()
  order: number; // position among the form's pages
  title?: string;       // shown to respondents at the top of THIS page; independent per page.
                         // Undefined shows a generic "Untitled form" placeholder — never falls
                         // back to another page's title or the user-facing Form.title.
  description?: string; // shown to respondents at the top of THIS page; independent per page
}

// Form Definition

export type FormStatus = 'draft' | 'published' | 'closed';

export interface LogicRule {
  condition: {
    fieldId: string;
    operator: 'equals';  // Only 'equals' is supported
    value: string;
  };
  action: 'show' | 'hide';
  targetFieldId: string; // must never equal condition.fieldId
}

// A curated set of theme choices, not a free-form editor. Absent = the default.
export type ButtonStyle = 'solid' | 'outline';
export type ButtonRadius = '4px' | '8px' | '16px';
export type CoverPosition = 'center' | 'top' | 'bottom';
export type FormSpacing = 'compact' | 'comfortable' | 'spacious';
export type FormFont =
  | 'dm_sans'
  | 'inter'
  | 'work_sans'
  | 'lora'
  | 'nunito'
  | 'poppins'
  | 'manrope'
  | 'plus_jakarta_sans'
  | 'outfit'
  | 'space_grotesk'
  | 'montserrat'
  | 'playfair_display'
  | 'merriweather'
  | 'source_serif_4'
  | 'fraunces'
  | 'dm_serif_display'
  | 'quicksand'
  | 'fredoka'
  | 'caveat'
  | 'pacifico'
  | 'bebas_neue'
  | 'space_mono';
export type TypeScale = 'compact' | 'default' | 'large';
export type CardStyle = 'flat' | 'soft' | 'bordered' | 'elevated';
export type PanelTreatment = 'solid' | 'gradient' | 'image' | 'pattern';
export type FieldGrouping = 'auto' | 'single';
export type CoverFit = 'banner' | 'original';
export type LogoSize = 'sm' | 'md' | 'lg';
export type FormWidth = 'narrow' | 'standard' | 'wide';
export type FieldStyle = 'outlined' | 'filled' | 'underline';
export type LabelPosition = 'above' | 'start';
export type ChoiceStyle = 'plain' | 'tiles';

/**
 * The owner's own colours, fields look and exact sizes: one versioned object, stored as branding.theme. Every key is optional and an absent
 * one is the default look. The backend validates it (hex colours, bounded whole numbers) and drops keys it does not know.
 */
export interface FormTheme {
  v: 1;
  colors?: { text?: string; heading?: string; card?: string; field?: string; fieldBorder?: string; buttonText?: string };
  fields?: { style?: FieldStyle; radius?: number; label?: LabelPosition; choice?: ChoiceStyle };
  card?: { radius?: number; shadow?: number };
  layout?: { maxWidth?: number; fieldGap?: number; /** Split Feature: which side the picture panel is on (start = the left in left-to-right languages). */ panelSide?: 'start' | 'end'; /** Split Feature: how much of the card the picture panel takes, 20 to 80 (percent). */ panelSplit?: number; /** Split Feature: where the title sits on the picture panel (the bottom when unset). */ panelText?: 'top' | 'bottom' };
  /** The typeface of the headings (the form title and page titles); absent = the same as the form's font. */
  fonts?: { heading?: FormFont };
  /** Who took the Unsplash photo used as the cover and/or the page background (one credit each), shown on the form. Only an unsplash.com profile address. */
  credit?: { cover?: PhotoCredit; background?: PhotoCredit };
  /** How big and wide the form's buttons are and how they react to the pointer. Absent = size and hover as before, buttons filling the row. */
  buttons?: { size?: ButtonSize; width?: ButtonWidth; hover?: ButtonHover };
  /** The owner's own words on the buttons (absent = Submit, Next, Back). They belong to this one form, so a saved style does not carry them. */
  labels?: { submit?: string; next?: string; back?: string };
  /** How the multi-page progress is drawn (absent = a bar). */
  progress?: { style?: ProgressStyle };
  /** A short line under the form (contact details, a thank-you for time). Also this one form's own words. */
  footer?: { note?: string };
  /** The screen a respondent sees after sending. Headline, picture and redirect are this one form's own; the colour and the confetti are look. */
  success?: { headline?: string; colour?: string; picture?: string; confetti?: boolean; redirect?: { url: string; seconds?: number } };
  /** The page behind the form: the two colours and the angle of a gradient, and how much a picture is darkened (percent) and blurred (pixels). */
  background?: { from?: string; to?: string; angle?: number; darken?: number; blur?: number };
  /** How tall the cover banner is, in pixels. */
  cover?: { height?: number };
  /** For the cover, the page background and the logo: the original a picture was cropped from and how it was framed, so the crop can be adjusted later. */
  crop?: { cover?: CropMemo; background?: CropMemo; logo?: CropMemo };
}

/** A crop that can be opened again: the original picture, the picture it made (the memo is only used while that is still the one in use) and the frame. */
export interface CropMemo {
  from: string;
  result: string;
  /** Width over height of the cropped picture. */
  aspect: number;
  /** The centre of the part kept, as a share of the whole picture (0 to 1 each way), and the zoom (1 to 4). */
  fx: number;
  fy: number;
  zoom: number;
}

export type ButtonSize = 'small' | 'default' | 'large';
export type ButtonWidth = 'fill' | 'auto';
export type ButtonHover = 'none' | 'lift' | 'darken';
export type ProgressStyle = 'bar' | 'dots' | 'steps';

export interface PhotoCredit {
  name: string;
  url: string;
}
export type PageBackground = 'wash' | 'plain' | 'solid' | 'gradient' | 'mesh' | 'dots' | 'grid' | 'image';

/** A form's mark: an uploaded logo, or an icon (name + colour) from the icon library; none of them = picked automatically from the name. */
export interface FormMark {
  logoUrl?: string | null;
  iconName?: string | null;
  /** The owner chose "No icon" on purpose (a form that never chose has neither this nor an icon, and is drawn the same). */
  iconNone?: boolean;
}

export interface BannerLink {
  label?: string;
  url: string;
}

export interface FormBranding {
  primaryColor?: string;   // hex color — overrides workspace default when set
  logoUrl?: string;
  coverImageUrl?: string;
  buttonStyle?: ButtonStyle;     // default 'solid'
  buttonRadius?: ButtonRadius;   // default '8px'
  coverPosition?: CoverPosition; // default 'center'
  showProgress?: boolean;        // default true — the multi-page progress indicator
  spacing?: FormSpacing;         // default 'comfortable'
  fontFamily?: FormFont;         // default 'dm_sans'
  typeScale?: TypeScale;         // default 'default'
  cardStyle?: CardStyle;         // default 'soft'
  panelTreatment?: PanelTreatment; // default 'solid' — the colour panel / banner behind the cover
  fieldGrouping?: FieldGrouping; // default 'auto' — short fields pair into two columns
  backgroundStyle?: PageBackground; // default 'wash' — how the PAGE behind the form card is filled (not the card)
  iconName?: string;             // the form's icon when it has no uploaded logo (lib/formIcons)
  iconNone?: boolean;            // "No icon" chosen on purpose; the default for a new form
  coverFit?: CoverFit;           // 'banner' crops the cover to a strip; 'original' shows the whole image at its own ratio
  logoSize?: LogoSize;           // default 'md' — how big the logo is drawn on the form's header
  formWidth?: FormWidth;         // default 'standard' — how wide the form card is
  backgroundImageUrl?: string;   // the owner's own picture, used when backgroundStyle is 'image'
  backgroundColor?: string;      // hex the page background is built from; absent = the primary colour
  theme?: FormTheme | null;      // colours, fields look and exact sizes; null only in a save, to clear it
  bannerText?: string;           // a line of text under the title on the form's header
  bannerLinks?: BannerLink[];    // up to 5 links on the form's header (http or https only)
}

// The layout presets replace the three V1 layout
// modes; legacy values stay readable and are mapped by lib/layoutPresets.ts normaliseLayout().
export type LayoutPreset = 'classic' | 'card_stack' | 'guided' | 'steps' | 'split_feature' | 'compact' | 'chat' | 'sidebar' | 'open' | 'focus';
export type LegacyLayout = 'single_column' | 'two_column' | 'compact';
export type AccessMode = 'open' | 'tracked' | 'login';

export interface FormSettings {
  honeypotEnabled: boolean;  // default: true
  successMessage?: string;
  responseLimit?: number;
  responseLimitEnabled?: boolean; // backend's actual enforcement flag — must be sent alongside responseLimit, it is NOT derived from responseLimit's presence
  closeDate?: string;        // ISO 8601 date string
  layout?: LayoutPreset | LegacyLayout; // undefined treated as 'classic' — always read via normaliseLayout()
  accessMode?: AccessMode;   // undefined treated as 'open'
}

export interface Form {
  _id: string;
  workspaceId: string | null; // null = personal form (no workspace)
  title: string;             // user-facing name — Forms Manager, browser tab, BuilderHeader top bar
  description?: string;       // user-facing note — set once at creation, not builder-editable
  status: FormStatus;
  slug?: string;             // public short id once published (drafts carry a reserved, NOT-live slug)
  publishedSlug?: string;    // server-assigned public short id - prefer via publicFormSlug()
  fields: FormField[];
  pages: FormPage[];         // always at least one page
  branding: FormBranding;
  settings: FormSettings;
  schemaVersion: number;
  responseCount: number;
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
  /** Moves only when builder content is saved (not on views, closing, archiving); the stale-save check compares it. */
  contentVersion?: number;
  /** Once published, an edit is staged on a draft instead of changing the live form (see fields/pages/branding/settings above, which ARE the
   * draft's content while one exists). True while that staged draft has not been published or discarded. */
  hasUnpublishedChanges?: boolean;
  draftSavedAt?: string | null; // when that staged draft was last written
  publishedAt?: string;      // ISO 8601
  /** The caller's own role on this form (per-form grant, workspace role, or owner). Set by GET /api/forms/:id. */
  myRole?: import('./workspace').Role;
  archivedAt?: string | null; // set = archived, never expires
  deletedAt?: string | null;  // set = in Trash
  /** Per-user private bookmark: true when the CALLER pinned this form. GET /api/forms normalises it to a boolean. */
  pinned?: boolean;
  pinnedAt?: string | null;
  // Source template link; null/absent for forms not created from a template.
  templateId?: string | null;
  templateCategory?: string | null;
  // Owner identity of a workspace-form row, as GET /api/forms returns it; read defensively
  // (optional, may be absent). A personal form's owner is always the caller, so this is only
  // ever consulted for a workspace-context row.
  owner?: {
    name: string;
    avatarUrl?: string;
  };
}

// Form Overview
// Both figures are nullable: the UI must tell "not tracked" apart from a real zero.

export interface FormOverviewStats {
  responseCount: number;
  responseCountThisWeek: number | null;
  completionRate: number | null;
}

// Publish readiness
// GET /api/forms/:formId/readiness.
export interface ReadinessIssue {
  code: string;
  fieldId?: string;
  message: string;
}

export interface Readiness {
  ready: boolean;
  blocking: ReadinessIssue[];
  warnings: ReadinessIssue[];
}

// POST /api/forms/:id/publish. The pre-flight commits its choices atomically.
export interface PublishBody {
  accessMode?: AccessMode;
  closeDate?: string | null;
}

export interface PublishResult {
  _id: string;
  status: 'published';
  slug: string;
  publishedAt?: string;
}

// One answer in a test submission. Same shape the public form sends.
export interface TestSubmissionAnswer {
  fieldId: string;
  fieldLabel?: string;
  value?: unknown;
}

// API Payload Types

import type { FormDestination } from './workspace';

export interface CreateFormPayload {
  title: string;
  description?: string;
  destination?: FormDestination;
  destinationWorkspaceId?: string | null;
  /** Starting branding — e.g. the logo chosen on the Create form page. Merged over the workspace defaults server-side. */
  branding?: Partial<FormBranding>;
}


export interface UpdateFormPayload {
  title?: string;
  description?: string;
  fields?: FormField[];
  pages?: FormPage[];  // each page carries its own title/description — see FormPage
  branding?: Partial<FormBranding>;
  settings?: Partial<FormSettings>;
  /** The contentVersion this edit is based on. The server refuses the save (409 FORM_STALE) if the form has moved on. */
  expectedContentVersion?: number;
  /** Identifies this save, so a retry of one whose reply was lost is recognised instead of refused. */
  saveId?: string;
}

// API Response Types

// Templates Gallery

/** The mark a form wears in lists: its uploaded logo, else its chosen icon (both optional). The same shape as `Form.branding`'s two fields. */
export interface FormMark {
  logoUrl?: string | null;
  iconName?: string | null;
  /** The owner chose "No icon" on purpose (a form that never chose has neither this nor an icon, and is drawn the same). */
  iconNone?: boolean;
}

export interface Template {
  _id: string;
  // The public gallery's URL segment (/discover-templates/:slug) — a readable name instead of the
  // raw id. Absent on a template from a backend that predates this field; the gallery falls back
  // to the id in that case (lib/templateSlug.ts).
  slug?: string;
  name: string;
  description: string;
  category: string;      // e.g. 'contact' | 'event' | 'feedback' | 'hiring'
  fields: FormField[];
  pages?: FormPage[];    // returned by GET /api/templates/public so a guest can copy the template client-side
  settings: FormSettings;
  isActive: boolean;
  showInGallery?: boolean; // false = internal/demo template, hidden from the public gallery
  /** Old slugs this template replaces (it was renamed): an old link to one of them opens this template. */
  replaces?: string[];
  source?: 'workspace' | 'beginso'; // absent = beginso
  // A curated built-in template, or one published from a real
  // form, can carry its own real branding — copied onto the new form the moment "Use this template"
  // runs (see POST /api/templates/:id/use), not just a client-computed look for the gallery preview.
  // Absent on an older template, which still falls back to templatePreview.ts's computed `templateLook()`.
  branding?: FormBranding;
}

// File Upload
// Files are stored on the backend server's local filesystem (not a cloud storage
// service); `url` is a backend-served route, not a pre-signed cloud storage URL.
// Matches the backend's actual response shape (confirmed against its
// checklist reply — there is no top-level `key`, only `url` + `metadata`).

export interface UploadResponse {
  success: boolean;
  message: string;
  url: string;             // Backend-served URL to access the uploaded file
  metadata: {
    id: string;
    name: string;           // original filename
    size: number;           // bytes
    type: string;           // MIME type
    path: string;           // backend storage filename
    owner: string;          // uploader's user id
    uploadTime: string;     // ISO-8601
    isBranding: boolean;
  };
}
