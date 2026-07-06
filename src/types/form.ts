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
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  helpText?: string;
  deleted: boolean;      // soft-delete flag — never remove from array
  order: number;
}

export interface TextField extends BaseField {
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

// ─── Form Definition ─────────────────────────────────────────────────────────

export type FormStatus = 'draft' | 'published' | 'closed';

export interface LogicRule {
  condition: {
    fieldId: string;
    operator: string;    // e.g. 'equals', 'not_equals', 'contains'
    value: string;
  };
  action: 'show' | 'hide';
  targetFieldId: string;
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
  [key: string]: unknown;
}

export interface Form {
  _id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: FormStatus;
  slug?: string;             // nanoid(10) — generated on publish only
  fields: FormField[];
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
