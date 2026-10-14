/**
 * Shared TypeScript interfaces for the Form Builder.
 * These types are shared between the builder store, API service, and components.
 */

// ─── Field Types ─────────────────────────────────────────────────────────────

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

// ─── Field Definitions ───────────────────────────────────────────────────────

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

// ─── Field constraint interfaces (Sprint 2 Part 2) ───────────────────────────

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

// File type and size are platform-enforced (lib/validateFile.ts on the client, the backend's upload limits on the server);
// the builder has no per-field setting for them, so this field has no extra keys.
export interface FileUploadField extends BaseField {
  type: 'file_upload';
}

// ─── V2 field types ──────────────────────────────────────────────────────────
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
  type: 'rating' | 'yes_no' | 'time' | 'datetime' | 'address' | 'signature';
}

export interface CurrencyField extends BaseField, NumberConstraints {
  type: 'currency';
  currency?: CurrencyCode; // default 'INR'
}

export interface UrlField extends BaseField {
  type: 'url';
  urlPreviewStyle?: UrlPreviewStyle; // default 'rich'
  urlDisplay?: UrlDisplay;           // default 'card'
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

export type FormField = TextField | ChoiceField | FileUploadField | SimpleField | CurrencyField | UrlField | ImageUploadField;

// ─── Pages (multi-page / multi-step forms) ───────────────────────────────────
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

// ─── Form Definition ─────────────────────────────────────────────────────────

export type FormStatus = 'draft' | 'published' | 'closed';

export interface LogicRule {
  condition: {
    fieldId: string;
    operator: 'equals';  // Sprint 2 MVP: only 'equals' supported
    value: string;
  };
  action: 'show' | 'hide';
  targetFieldId: string; // must never equal condition.fieldId
}

// Sprint 13 (CF2.3). A curated set of theme choices, not a free-form editor. Absent = the default.
export type ButtonStyle = 'solid' | 'outline';
export type ButtonRadius = '4px' | '8px' | '16px';
export type CoverPosition = 'center' | 'top' | 'bottom';
export type FormSpacing = 'compact' | 'comfortable' | 'spacious';
export type FormFont = 'dm_sans' | 'inter' | 'work_sans' | 'lora' | 'nunito';
export type TypeScale = 'compact' | 'default' | 'large';
export type CardStyle = 'flat' | 'soft' | 'bordered' | 'elevated';
export type PanelTreatment = 'solid' | 'gradient' | 'image' | 'pattern';
export type FieldGrouping = 'auto' | 'single';
export type CoverFit = 'banner' | 'original';
export type FormWidth = 'narrow' | 'standard' | 'wide';
export type PageBackground = 'wash' | 'plain' | 'solid' | 'gradient' | 'mesh' | 'dots' | 'grid' | 'image';

/** A form's mark: an uploaded logo, or an icon (name + colour) from the icon library; none of them = picked automatically from the name. */
export interface FormMark {
  logoUrl?: string | null;
  iconName?: string | null;
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
  coverFit?: CoverFit;           // 'banner' crops the cover to a strip; 'original' shows the whole image at its own ratio
  formWidth?: FormWidth;         // default 'standard' — how wide the form card is
  backgroundImageUrl?: string;   // the owner's own picture, used when backgroundStyle is 'image'
  backgroundColor?: string;      // hex the page background is built from; absent = the primary colour
}

// Sprint 13 (builder-publish-respondent), design.md §13. Six presets replace the three V1 layout
// modes; legacy values stay readable and are mapped by lib/layoutPresets.ts normaliseLayout().
export type LayoutPreset = 'classic' | 'card_stack' | 'guided' | 'steps' | 'split_feature' | 'compact';
export type LegacyLayout = 'single_column' | 'two_column' | 'compact';
export type AccessMode = 'open' | 'tracked' | 'login';

export interface FormSettings {
  honeypotEnabled: boolean;  // default: true
  successMessage?: string;
  responseLimit?: number;
  responseLimitEnabled?: boolean; // backend's actual enforcement flag — must be sent alongside responseLimit, it is NOT derived from responseLimit's presence
  closeDate?: string;        // ISO 8601 date string
  layout?: LayoutPreset | LegacyLayout; // undefined treated as 'classic' — always read via normaliseLayout()
  accessMode?: AccessMode;   // Backend contract to confirm (BE 0.6) — undefined treated as 'open'
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
  publishedAt?: string;      // ISO 8601
  /** The caller's own role on this form (per-form grant, workspace role, or owner). Set by GET /api/forms/:id. */
  myRole?: import('./workspace').Role;
  archivedAt?: string | null; // Backend contract to confirm (BE 0.8) — set = archived, never expires
  deletedAt?: string | null;  // Backend contract to confirm (BE 0.8) — set = in Trash
  /** Per-user private bookmark: true when the CALLER pinned this form. GET /api/forms normalises it to a boolean. */
  pinned?: boolean;
  pinnedAt?: string | null;
  // Sprint 14 (BE 0.4) - source template link; null/absent for forms not created from a template.
  templateId?: string | null;
  templateCategory?: string | null;
  // sprint-10-events-migration requirements.md §7.9 — Backend contract to confirm whether
  // GET /api/forms already returns owner identity for a workspace-form row; read defensively
  // (optional, may be absent). A personal form's owner is always the caller, so this is only
  // ever consulted for a workspace-context row.
  owner?: {
    name: string;
    avatarUrl?: string;
  };
}

// ─── Form Overview (sprint-10, design.md §13) ─────────────────────────────────
// Backend contract to confirm (BE 0.6). Both figures are nullable here, one more than design.md
// §13's sketch (which only nulls `completionRate`): until the backend extends GET /api/forms/:id,
// "this week" is simply absent, and the UI must tell "not tracked" apart from a real zero.

export interface FormOverviewStats {
  responseCount: number;
  responseCountThisWeek: number | null;
  completionRate: number | null;
}

// ─── Publish readiness (Sprint 13, CF2.5) ─────────────────────────────────────
// Backend contract to confirm (BE 0.4) — GET /api/forms/:formId/readiness.
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

// Sprint 13 (CF6.5) — POST /api/forms/:id/publish. The pre-flight commits its choices atomically.
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

// Sprint 13 (CF2.6) — one answer in a test submission. Same shape the public form sends.
export interface TestSubmissionAnswer {
  fieldId: string;
  fieldLabel?: string;
  value?: unknown;
}

// ─── API Payload Types ────────────────────────────────────────────────────────

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
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface FormsListResponse {
  forms: Form[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateFormResponse {
  _id: string;
  title: string;
}

// ─── Templates Gallery ────────────────────────────────────────────────────────

export interface Template {
  _id: string;
  name: string;
  description: string;
  category: string;      // e.g. 'contact' | 'event' | 'feedback' | 'hiring'
  fields: FormField[];
  settings: FormSettings;
  isActive: boolean;
  source?: 'workspace' | 'beginso'; // Backend contract to confirm (BE 0.13) — absent = beginso
}

// ─── File Upload ──────────────────────────────────────────────────────────────
// Files are stored on the backend server's local filesystem (not a cloud storage
// service); `url` is a backend-served route, not a pre-signed cloud storage URL.
// Matches the backend's actual response shape (confirmed against its Sprint 2
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
