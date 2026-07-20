/**
 * Mock GET /api/public/:slug fixture used to unblock SSR/component development
 * ahead of the backend endpoint (targeted Wed 22 Jul). Swap for the real fetch
 * once it lands — no code shape change expected.
 */

import type { FormField, FormPage } from '@/types/form';
import type { PublicFormSchema } from '@/types/publicForm';

const pages: FormPage[] = [
  { id: 'page-1', order: 0, title: 'About you', description: 'Tell us a bit about yourself.' },
  { id: 'page-2', order: 1, title: 'Your feedback' },
];

const fields: FormField[] = [
  {
    fieldId: 'f-short-text', pageId: 'page-1', type: 'short_text', label: 'Full name',
    required: true, deleted: false, order: 0, maxLength: 80, placeholder: 'Jane Doe',
  },
  {
    fieldId: 'f-email', pageId: 'page-1', type: 'email', label: 'Email address',
    required: true, deleted: false, order: 1,
  },
  {
    fieldId: 'f-phone', pageId: 'page-1', type: 'phone', label: 'Phone number',
    required: false, deleted: false, order: 2,
  },
  {
    fieldId: 'f-number', pageId: 'page-1', type: 'number', label: 'Age',
    required: false, deleted: false, order: 3, min: 0, max: 120,
  },
  {
    fieldId: 'f-date', pageId: 'page-1', type: 'date', label: 'Date of birth',
    required: false, deleted: false, order: 4,
  },
  {
    fieldId: 'f-dropdown', pageId: 'page-1', type: 'dropdown', label: 'Country',
    required: true, deleted: false, order: 5, options: ['United States', 'Canada', 'United Kingdom'],
    // Hides "Tell us more" on page 2 when the respondent selects "Canada".
    logicRules: [
      {
        condition: { fieldId: 'f-dropdown', operator: 'equals', value: 'Canada' },
        action: 'hide',
        targetFieldId: 'f-long-text',
      },
    ],
  },
  {
    fieldId: 'f-long-text', pageId: 'page-2', type: 'long_text', label: 'Tell us more',
    required: false, deleted: false, order: 0, maxLength: 500,
  },
  {
    fieldId: 'f-multiple-choice', pageId: 'page-2', type: 'multiple_choice', label: 'How did you hear about us?',
    required: true, deleted: false, order: 1, options: ['Search', 'Friend', 'Social media', 'Other'],
  },
  {
    fieldId: 'f-checkbox', pageId: 'page-2', type: 'checkbox', label: 'Which features interest you?',
    required: false, deleted: false, order: 2, options: ['Forms', 'Analytics', 'Integrations'],
  },
  {
    fieldId: 'f-file-upload', pageId: 'page-2', type: 'file_upload', label: 'Attach a file (optional)',
    required: false, deleted: false, order: 3,
  },
];

export const mockPublicFormSchema: PublicFormSchema = {
  title: 'Customer Feedback Survey',
  pages,
  fields,
  branding: { primaryColor: '#1D4ED8' },
  settings: { honeypotEnabled: true, successMessage: 'Thanks for your feedback!' },
};

export const mockSubmitResponse = { ok: true, status: 200 } as const;
