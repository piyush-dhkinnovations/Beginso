import type { FormMark } from '@/types/form';
/**
 * Sprint 13 (A5.1–A5.4, design.md §11.2/§13). Backend contract to confirm (BE 0.10, 0.12) — every
 * shape here is a proposal. Respondent payloads never carry stage names, tags, assignees, notes or
 * scores; the status is a fixed respondent-safe set derived from stage category.
 */
export type RespondentStatus = 'Received' | 'In review' | 'Completed' | 'Edited';

export type LinkState = 'valid' | 'expired' | 'used' | 'invalid';

export interface RespondLinkField {
  fieldId: string;
  label: string;
  type: string;
  value: unknown;
  required?: boolean;
  options?: string[];
}

export interface RespondLinkView {
  state: LinkState;
  formName?: string;
  formSlug?: string;
  submittedAt?: string;
  expiresAt?: string;
  canEdit?: boolean;
  readOnlyReason?: 'closed' | 'archived' | 'trashed' | 'finalised';
  status?: RespondentStatus;
  fields?: RespondLinkField[];
  accountExists?: boolean;
  email?: string;
}

export interface MySubmission {
  id: string;
  formName: string;
  /** The form's logo / icon (absent on an older backend). */
  branding?: FormMark;
  ownerName: string;
  submittedAt: string;
  status: RespondentStatus;
  canEdit: boolean;
}
