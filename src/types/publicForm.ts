/**
 * Types for the respondent-facing public form (Sprint 3).
 * Augments — does not replace — the admin-side types in src/types/form.ts.
 */

import type { Control, FieldError, UseFormRegister } from 'react-hook-form';
import type { FormField, FormPage, FormSettings } from '@/types/form';

// ─── API Response: GET /api/public/:slug ──────────────────────────────────────

export interface PublicFormBranding {
  primaryColor?: string;
  logoUrl?: string;
  coverImageUrl?: string;
}

/** Shape returned by GET /api/public/:slug — admin-only fields omitted. */
export interface PublicFormSchema {
  title: string;
  pages: FormPage[];
  fields: FormField[]; // all non-deleted fields across all pages, order preserved
  branding: PublicFormBranding;
  settings: Pick<FormSettings, 'honeypotEnabled' | 'successMessage' | 'responseLimit' | 'closeDate'>;
}

// ─── Field Value Types ──────────────────────────────────────────────────────────

/** A single field's value in the RHF form state. */
export type FieldValue = string | string[] | number | undefined;

// ─── Submission Payload ─────────────────────────────────────────────────────────

export interface Answer {
  fieldId: string;
  pageId: string;
  value: FieldValue;
}

/** The `data` part of the multipart/form-data submission. */
export interface SubmissionData {
  answers: Answer[];
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
  error?: FieldError;
  disabled?: boolean; // true while form is submitting
}
