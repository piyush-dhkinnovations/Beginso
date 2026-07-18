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
  | 'file_upload';

// ─── Field Definitions ───────────────────────────────────────────────────────

export interface BaseField {
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

export interface FileUploadField extends BaseField {
  type: 'file_upload';
  allowedTypes?: string[];
  maxSizeMb?: number;
}

export type FormField = TextField | ChoiceField | FileUploadField;

// ─── Pages (multi-page / multi-step forms) ───────────────────────────────────
// Every form has at least one page, even simple single-page forms — a page is
// not an opt-in feature, it's the always-present unit fields belong to.

export interface FormPage {
  id: string;    // UUID — immutable once created; assigned via crypto.randomUUID()
  order: number; // position among the form's pages
  title?: string;       // shown to respondents at the top of THIS page; independent per page.
                         // Undefined shows a generic "Untitled form" placeholder — never falls
                         // back to another page's title or the admin-facing Form.title.
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

export interface FormBranding {
  primaryColor?: string;   // hex color — overrides workspace default when set
  logoUrl?: string;
  coverImageUrl?: string;
}

export interface FormSettings {
  honeypotEnabled: boolean;  // default: true
  successMessage?: string;
  responseLimit?: number;
  closeDate?: string;        // ISO 8601 date string
  layout?: 'single_column' | 'two_column' | 'compact'; // undefined treated as 'single_column'
}

export interface Form {
  _id: string;
  workspaceId: string;
  title: string;              // admin-facing name — Forms Manager, browser tab, BuilderHeader top bar
  description?: string;       // admin-facing note — set once at creation, not builder-editable
  status: FormStatus;
  slug?: string;             // nanoid(10) — generated on publish only
  fields: FormField[];
  pages: FormPage[];         // always at least one page
  branding: FormBranding;
  settings: FormSettings;
  schemaVersion: number;
  responseCount: number;
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
  publishedAt?: string;      // ISO 8601
}

// ─── API Payload Types ────────────────────────────────────────────────────────

export interface CreateFormPayload {
  title: string;
  description?: string;
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
}

// ─── File Upload ──────────────────────────────────────────────────────────────
// Files are stored on the backend server's local filesystem (not a cloud storage
// service); `url` is a backend-served route, not a pre-signed cloud storage URL.

export interface UploadResponse {
  url: string;            // Backend-served URL to access the uploaded file
  key: string;             // Backend file identifier / storage path (never displayed to user)
}
