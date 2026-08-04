/**
 * __tests__/components/responses/ResponseRow.test.tsx
 * Feature: sprint-4-responses
 * Tests: ResponseRow — timestamp/status/preview render, row click, checkbox stop-propagation, delete
 * Requirements: 2.1, 2.2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseRow } from '@/components/responses/ResponseRow';
import type { IResponse } from '@/types/response';

const response: IResponse = {
  _id: 'resp-1',
  formId: 'form-1',
  workspaceId: 'ws-1',
  answers: [
    { fieldId: 'f1', fieldType: 'short_text', fieldLabel: 'Name', value: 'Priya Sharma' },
    { fieldId: 'f2', fieldType: 'email', fieldLabel: 'Email', value: 'priya@example.com' },
  ],
  status: 'new',
  metadata: { ipHash: 'a1b2c3d4e5f60718', userAgent: 'Mozilla/5.0' },
  submittedAt: '2026-08-03T09:50:00.000Z',
  updatedAt: '2026-08-03T09:50:00.000Z',
};

function renderRow(overrides: Partial<React.ComponentProps<typeof ResponseRow>> = {}) {
  const props = {
    response,
    isSelected: false,
    onSelect: vi.fn(),
    onView: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(
    <table>
      <tbody>
        <ResponseRow {...props} />
      </tbody>
    </table>
  );
  return props;
}

describe('ResponseRow', () => {
  it('renders timestamp, status badge, and answer preview', () => {
    renderRow();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma · priya@example.com')).toBeInTheDocument();
  });

  it('clicking the row body fires onView', async () => {
    const user = userEvent.setup();
    const props = renderRow();
    await user.click(screen.getByText('Priya Sharma · priya@example.com'));
    expect(props.onView).toHaveBeenCalledOnce();
  });

  it('clicking the checkbox fires onSelect and does not fire onView', async () => {
    const user = userEvent.setup();
    const props = renderRow();
    await user.click(screen.getByRole('checkbox'));
    expect(props.onSelect).toHaveBeenCalledWith(true);
    expect(props.onView).not.toHaveBeenCalled();
  });

  it('clicking delete fires onDelete and does not fire onView', async () => {
    const user = userEvent.setup();
    const props = renderRow();
    await user.click(screen.getByRole('button', { name: 'Delete response' }));
    expect(props.onDelete).toHaveBeenCalledOnce();
    expect(props.onView).not.toHaveBeenCalled();
  });
});
