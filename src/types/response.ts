/**
 * Shared TypeScript interfaces for Response Management (Sprint 4).
 * Matches the backend contract in docs/backend-contract/api-reference.md §4.
 */

import type { FieldType } from './form';

export type ResponseStatus = 'new' | 'in_progress' | 'completed';

export interface IAnswer {
  fieldId: string;
  fieldType: FieldType;
  fieldLabel: string;      // snapshotted at submission time — never changes historically
  value: string | string[] | number | null;
  fileKey?: string;        // backend-internal R2 key — file_upload answers only, never used directly
}

export interface IResponseFile {
  _id: string;
  responseId: string;
  fieldId: string;
  originalName: string;
  sanitizedName: string;
  size: number;             // bytes
  mimeType: string;
  createdAt: string;        // ISO 8601
}

export interface IResponse {
  _id: string;
  formId: string;
  workspaceId: string;
  answers: IAnswer[];
  status: ResponseStatus;
  metadata: {
    ipHash: string;          // SHA-256(rawIP), truncated — raw IP never stored
    userAgent: string;
  };
  submittedAt: string;       // ISO 8601
  updatedAt: string;         // ISO 8601
}

export interface ResponseDetail extends IResponse {
  responseFiles: IResponseFile[];  // joined server-side on GET /api/responses/:id
}

export interface GetResponsesParams {
  formId: string;
  status?: ResponseStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponsesResult {
  data: IResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
