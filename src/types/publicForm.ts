/**
 * Types for the respondent-facing public form (Sprint 3).
 * Augments — does not replace — the user-side types in src/types/form.ts.
 */

import type { Control, FieldError, UseFormRegister, UseFormSetValue, UseFormTrigger } from 'react-hook-form';
import type { FormField, FormPage, FormSettings } from '@/types/form';

// ─── API Response: GET /api/public/:slug ──────────────────────────────────────

export interface PublicFormBranding {
  primaryColor?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  buttonStyle?: 'solid' | 'outline';
  buttonRadius?: '4px' | '8px' | '16px';
  coverPosition?: 'center' | 'top' | 'bottom';
  showProgress?: boolean;
  spacing?: 'compact' | 'comfortable' | 'spacious';
  fontFamily?: 'dm_sans' | 'inter' | 'work_sans' | 'lora' | 'nunito';
  typeScale?: 'compact' | 'default' | 'large';
  cardStyle?: 'flat' | 'soft' | 'bordered' | 'elevated';
  panelTreatment?: 'solid' | 'gradient' | 'image' | 'pattern';
  fieldGrouping?: 'auto' | 'single';
  /** 'none' is never stored: the form page sets it for an embed with ?bg=0 (no page background). */
  backgroundStyle?: 'wash' | 'plain' | 'solid' | 'gradient' | 'mesh' | 'dots' | 'grid' | 'image' | 'none';
  backgroundColor?: string;
  backgroundImageUrl?: string;
  formWidth?: 'narrow' | 'standard' | 'wide';
  coverFit?: 'banner' | 'original';
  iconName?: string;
}

/** Shape returned by GET /api/public/:slug — user-only fields omitted. */
export interface PublicFormSchema {
  title: string;
  pages: FormPage[];
  fields: FormField[]; // all non-deleted fields across all pages, order preserved
  branding: PublicFormBranding;
  settings: Pick<FormSettings, 'honeypotEnabled' | 'successMessage' | 'responseLimit' | 'closeDate' | 'layout' | 'accessMode'>;
}

// ─── Field Value Types ──────────────────────────────────────────────────────────

/** A single field's value in the RHF form state. */
export type FieldValue = string | string[] | number | undefined;

// ─── Submission Payload ─────────────────────────────────────────────────────────

/**
 * Matches the backend's documented Answer schema (docs/product/03-technical-design.md §3.6) —
 * fieldType/fieldLabel are snapshotted at submission time so a later rename/type-change
 * never rewrites historical responses. No pageId: the backend already knows each
 * field's page from the form snapshot it validates against.
 */
export interface Answer {
  fieldId: string;
  fieldType: FormField['type'];
  fieldLabel: string;
  value?: FieldValue;
  fileKey?: string; // file_upload fields only — backend fills this in after R2/storage upload
}

/** The `data` part of the multipart/form-data submission. */
export interface SubmissionData {
  answers: Answer[];
  /** Mode 2 (tracked) only — the built-in "Your email" step, kept outside `answers` (OQ-4). Backend contract to confirm (BE 0.6). */
  respondentEmail?: string;
}

// ─── Upload State ───────────────────────────────────────────────────────────────

export type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'failed';

export interface UploadState {
  status: UploadStatus;
  fileName?: string;
  fileSize?: number;
  progress?: number; // 0–100
  error?: string;
  key?: string; // R2 key returned by backend on success — included in submission
}

// ─── Service Error ───────────────────────────────────────────────────────────────

export interface PublicFormError {
  message: string;
  status: number;
}

// ─── Field Renderer Contract ─────────────────────────────────────────────────────

export interface FieldRendererProps {
  field: FormField;
  control: Control<Record<string, FieldValue>>;
  register: UseFormRegister<Record<string, FieldValue>>;
  trigger: UseFormTrigger<Record<string, FieldValue>>;
  setValue: UseFormSetValue<Record<string, FieldValue>>;
  error?: FieldError;
  disabled?: boolean; // true while form is submitting
  /** Compact layout's label-left row style — passed through to FieldShell, ignored by renderers that don't use it. */
  inline?: boolean;
}

export interface FileUploadRendererProps extends FieldRendererProps {
  /** Hands the raw File up to PublicFormShell's files map (submitForm's third argument) — RHF only ever holds a string placeholder, never the binary. Called with null on remove. */
  onFileChange?: (file: File | null) => void;
  /** image_upload: hands up every chosen image (an empty array when all are removed). */
  onFilesChange?: (files: File[]) => void;
  /** Lets PublicFormShell disable Submit while this field's (simulated) upload is in-flight. */
  onUploadStateChange?: (state: UploadState) => void;
}
