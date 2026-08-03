/**
 * Mock fixtures for Response Management (Sprint 4), unblocking frontend work ahead
 * of the backend endpoints in docs/backend-contract/api-reference.md §4 going live.
 * Swap for the real `responsesService` calls once confirmed — same shape.
 */

import type {
  IAnswer,
  IResponse,
  IResponseFile,
  PaginatedResponsesResult,
  ResponseDetail,
} from '@/types/response';

const ALL_FIELD_ANSWERS: IAnswer[] = [
  { fieldId: 'f-short-text', fieldType: 'short_text', fieldLabel: 'Full Name', value: 'Priya Sharma' },
  { fieldId: 'f-long-text', fieldType: 'long_text', fieldLabel: 'Comments', value: 'Looking forward to the event, thanks for organising this!' },
  { fieldId: 'f-email', fieldType: 'email', fieldLabel: 'Email Address', value: 'priya@example.com' },
  { fieldId: 'f-phone', fieldType: 'phone', fieldLabel: 'Phone Number', value: '+91 98765 43210' },
  { fieldId: 'f-number', fieldType: 'number', fieldLabel: 'Years of Experience', value: 5 },
  { fieldId: 'f-date', fieldType: 'date', fieldLabel: 'Preferred Date', value: '2026-08-10' },
  { fieldId: 'f-dropdown', fieldType: 'dropdown', fieldLabel: 'Country', value: 'India' },
  { fieldId: 'f-multiple-choice', fieldType: 'multiple_choice', fieldLabel: 'Referral Source', value: 'Social media' },
  { fieldId: 'f-checkbox', fieldType: 'checkbox', fieldLabel: 'Topics', value: ['Design', 'Development'] },
  { fieldId: 'f-file-upload', fieldType: 'file_upload', fieldLabel: 'Resume', value: null, fileKey: 'r2/resume.pdf' },
];

function makeResponse(overrides: Partial<IResponse> = {}): IResponse {
  return {
    _id: '6b1f0e2a9497f0a0ea093b01',
    formId: 'mock-form-id',
    workspaceId: 'mock-workspace-id',
    answers: ALL_FIELD_ANSWERS.slice(0, 3),
    status: 'new',
    metadata: { ipHash: 'a1b2c3d4e5f60718', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0' },
    submittedAt: '2026-08-03T09:50:00.000Z',
    updatedAt: '2026-08-03T09:50:00.000Z',
    ...overrides,
  };
}

export function mockResponsesList(overrides: Partial<PaginatedResponsesResult> = {}): PaginatedResponsesResult {
  const data: IResponse[] = [
    makeResponse({ _id: 'resp-1', status: 'new', submittedAt: '2026-08-03T09:50:00.000Z' }),
    makeResponse({ _id: 'resp-2', status: 'in_progress', submittedAt: '2026-08-03T08:30:00.000Z', answers: ALL_FIELD_ANSWERS.slice(2, 5) }),
    makeResponse({ _id: 'resp-3', status: 'completed', submittedAt: '2026-08-02T17:10:00.000Z', answers: ALL_FIELD_ANSWERS.slice(4, 7) }),
    makeResponse({ _id: 'resp-4', status: 'new', submittedAt: '2026-08-02T11:05:00.000Z', answers: [ALL_FIELD_ANSWERS[9]] }),
    makeResponse({ _id: 'resp-5', status: 'completed', submittedAt: '2026-08-01T14:22:00.000Z', answers: ALL_FIELD_ANSWERS.slice(0, 2) }),
  ];
  return { data, total: data.length, page: 1, limit: 50, totalPages: 1, ...overrides };
}

export function mockResponseDetail(id = 'resp-1', overrides: Partial<ResponseDetail> = {}): ResponseDetail {
  const responseFiles: IResponseFile[] = [
    {
      _id: 'file-1',
      responseId: id,
      fieldId: 'f-file-upload',
      originalName: 'resume.pdf',
      sanitizedName: 'resume-6b20.pdf',
      size: 251904,
      mimeType: 'application/pdf',
      createdAt: '2026-08-03T09:50:00.000Z',
    },
  ];
  return {
    ...makeResponse({ _id: id, answers: ALL_FIELD_ANSWERS }),
    responseFiles,
    ...overrides,
  };
}

export function mockFileUrl(): { url: string } {
  return { url: 'https://mock-r2.example.com/resume.pdf' };
}
