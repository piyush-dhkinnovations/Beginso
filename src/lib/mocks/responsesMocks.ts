/**
 * Mock fixtures for Response Management — used only by tests now (see tasks.md 5.7).
 * Shapes match the confirmed-live backend contract (docs/backend-contract/api-reference.md §3,
 * frozen 2026-08-05): `answers` is a flat label→value object, `ipHash` is top-level, and there
 * is no `userAgent` anywhere in these payloads.
 */

import type {
  IResponse,
  IResponseFile,
  PaginatedResponsesResult,
  ResponseAnswers,
  ResponseDetail,
} from '@/types/response';

const ALL_FIELD_ANSWERS: ResponseAnswers = {
  'Full Name': 'Priya Sharma',
  Comments: 'Looking forward to the event, thanks for organising this!',
  'Email Address': 'priya@example.com',
  'Phone Number': '+91 98765 43210',
  'Years of Experience': 5,
  'Preferred Date': '2026-08-10',
  Country: 'India',
  'Referral Source': 'Social media',
  Topics: ['Design', 'Development'],
};

function pickAnswers(keys: string[]): ResponseAnswers {
  return Object.fromEntries(keys.map((k) => [k, ALL_FIELD_ANSWERS[k]]));
}

// Sprint 12 (inbox-collaboration) — `stage`/`assignee`/`tags` are now required on `IResponse`;
// `status` is kept only as the deprecated derived field, still handy for these mocks' own
// `status: 'new' | 'in_progress' | 'completed'` overrides below (mapped onto a matching stage).
export const MOCK_STAGES: Record<'new' | 'in_progress' | 'completed', IResponse['stage']> = {
  new: { id: 'stage-new', name: 'New', colour: 'info', category: 'new' },
  in_progress: { id: 'stage-in-progress', name: 'In Progress', colour: 'warning', category: 'in_progress' },
  completed: { id: 'stage-completed', name: 'Completed', colour: 'success', category: 'completed' },
};

function makeResponse(overrides: Partial<IResponse> = {}): IResponse {
  const status = overrides.status ?? 'new';
  return {
    _id: '6b1f0e2a9497f0a0ea093b01',
    formId: 'mock-form-id',
    reference: '#1',
    answers: pickAnswers(['Full Name', 'Email Address']),
    stage: MOCK_STAGES[status],
    status,
    assignee: null,
    tags: [],
    noteCount: 0,
    attachmentCount: 0,
    unread: false,
    duplicateOfId: null,
    ipHash: 'a1b2c3d4e5f60718',
    submittedAt: '2026-08-03T09:50:00.000Z',
    createdAt: '2026-08-03T09:50:00.000Z',
    updatedAt: '2026-08-03T09:50:00.000Z',
    ...overrides,
  };
}

export function mockResponsesList(overrides: Partial<PaginatedResponsesResult> = {}): PaginatedResponsesResult {
  const data: IResponse[] = [
    makeResponse({ _id: 'resp-1', status: 'new', submittedAt: '2026-08-03T09:50:00.000Z' }),
    makeResponse({ _id: 'resp-2', status: 'in_progress', submittedAt: '2026-08-03T08:30:00.000Z', answers: pickAnswers(['Phone Number', 'Years of Experience']) }),
    makeResponse({ _id: 'resp-3', status: 'completed', submittedAt: '2026-08-02T17:10:00.000Z', answers: pickAnswers(['Country', 'Referral Source']) }),
    makeResponse({ _id: 'resp-4', status: 'new', submittedAt: '2026-08-02T11:05:00.000Z', answers: pickAnswers(['Topics']) }),
    makeResponse({ _id: 'resp-5', status: 'completed', submittedAt: '2026-08-01T14:22:00.000Z', answers: pickAnswers(['Full Name', 'Comments']) }),
  ];
  return { data, total: data.length, page: 1, limit: 50, totalPages: 1, ...overrides };
}

export function mockResponseDetail(id = 'resp-1', overrides: Partial<ResponseDetail> = {}): ResponseDetail {
  const responseFiles: IResponseFile[] = [
    {
      id: 'file-1',
      name: 'resume.pdf',
      size: 251904,
      type: 'application/pdf',
      url: 'https://mock-r2.example.com/resume.pdf',
      uploadTime: '2026-08-03T09:50:00.000Z',
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
