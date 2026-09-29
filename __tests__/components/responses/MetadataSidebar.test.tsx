/**
 * __tests__/components/responses/MetadataSidebar.test.tsx
 * Feature: sprint-4-responses; migrated by sprint-12-inbox-collaboration task 1.3 to a stage
 * picker (`onStageChange`/`isUpdatingStage`/`stages`) rather than the removed status union.
 * Tests: Workflow/Submission section grouping, ipHash, formatted date, Response ID, stage
 * dropdown wiring. Delete now lives in ResponseDrawer's sticky footer, not here.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetadataSidebar } from '@/components/responses/MetadataSidebar';
import { mockResponseDetail, MOCK_STAGES } from '@/lib/mocks/responsesMocks';

const STAGES = [MOCK_STAGES.new, MOCK_STAGES.in_progress, MOCK_STAGES.completed];

describe('MetadataSidebar', () => {
  it('renders Workflow and Submission section headings', () => {
    render(<MetadataSidebar response={mockResponseDetail()} stages={STAGES} onStageChange={vi.fn()} isUpdatingStage={false} />);
    expect(screen.getByText('Workflow')).toBeInTheDocument();
    expect(screen.getByText('Submission')).toBeInTheDocument();
  });

  it('uses a compact single-row layout for the workflow status control', () => {
    render(<MetadataSidebar response={mockResponseDetail()} stages={STAGES} onStageChange={vi.fn()} isUpdatingStage={false} />);
    expect(screen.getByRole('group', { name: 'Workflow' })).toHaveClass('items-center', 'justify-between', 'p-3');
  });

  it('renders the ipHash in a code element under Origin', () => {
    render(<MetadataSidebar response={mockResponseDetail()} />);
    const code = screen.getByText('a1b2c3d4e5f60718');
    expect(code.tagName).toBe('CODE');
  });

  it('renders a "—" fallback instead of crashing when ipHash is absent', () => {
    // Real crash: the backend doesn't always resolve a client IP for a submission, so ipHash can
    // be missing entirely rather than an empty string.
    const response = mockResponseDetail();
    delete response.ipHash;

    render(<MetadataSidebar response={response} />);

    expect(screen.getByText('—').tagName).toBe('CODE');
  });

  it('renders the formatted submission date under Date', () => {
    render(<MetadataSidebar response={mockResponseDetail()} />);
    expect(screen.getByText(/03 Aug 2026/)).toBeInTheDocument();
  });

  it('renders the shortened Response ID', () => {
    render(<MetadataSidebar response={mockResponseDetail('6b1f0e2a9497f0a0ea093b01')} />);
    expect(screen.getByText('093B01')).toBeInTheDocument();
  });

  it('does not render the stage control when no stages/onStageChange are given', () => {
    render(<MetadataSidebar response={mockResponseDetail()} />);
    expect(screen.queryByRole('button', { name: 'Response stage' })).not.toBeInTheDocument();
  });

  it('renders the stage dropdown pre-set to the current stage and fires onStageChange', async () => {
    const user = userEvent.setup();
    const onStageChange = vi.fn();
    render(<MetadataSidebar response={mockResponseDetail()} stages={STAGES} onStageChange={onStageChange} isUpdatingStage={false} />);

    const trigger = screen.getByRole('button', { name: 'Response stage' });
    expect(trigger).toHaveTextContent('New');

    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: /Completed/ }));
    expect(onStageChange).toHaveBeenCalledWith('stage-completed');
  });

  it('disables the stage dropdown while isUpdatingStage is true', () => {
    render(<MetadataSidebar response={mockResponseDetail()} stages={STAGES} onStageChange={vi.fn()} isUpdatingStage />);
    expect(screen.getByRole('button', { name: 'Response stage' })).toBeDisabled();
  });
});
