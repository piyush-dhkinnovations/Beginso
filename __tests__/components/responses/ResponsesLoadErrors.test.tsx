import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { FormLoadError, NoResponsesYet, ResponsesListError } from '@/components/responses/ResponsesLoadErrors';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const axiosError = (status: number) => new AxiosError('x', 'ERR', undefined, undefined, { status } as AxiosResponse);

describe('FormLoadError', () => {
  it('403 shows access denied and navigates to Forms', async () => {
    push.mockClear();
    render(<FormLoadError error={axiosError(403)} onRetry={vi.fn()} />);
    expect(screen.getByText('Access denied')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Go to Forms' }));
    expect(push).toHaveBeenCalledWith('/forms');
  });

  it('404 shows not found with no retry', () => {
    render(<FormLoadError error={axiosError(404)} onRetry={vi.fn()} />);
    expect(screen.getByText('Form not found')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it.each([[axiosError(500)], [new Error('boom')]])('other errors show a generic message and retry', async (err) => {
    const onRetry = vi.fn();
    render(<FormLoadError error={err} onRetry={onRetry} />);
    expect(screen.getByText('Unable to load form')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('ResponsesListError', () => {
  it('offers a retry', async () => {
    const onRetry = vi.fn();
    render(<ResponsesListError onRetry={onRetry} />);
    expect(screen.getByText('Unable to load responses')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('NoResponsesYet', () => {
  it('with a form id links to the share tab', async () => {
    push.mockClear();
    render(<NoResponsesYet formId="f1" />);
    expect(screen.getByText('No responses yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Share Form' }));
    expect(push).toHaveBeenCalledWith('/forms/f1/edit?tab=share');
  });

  it('without a form id falls back to Forms', async () => {
    push.mockClear();
    render(<NoResponsesYet />);
    await userEvent.click(screen.getByRole('button', { name: 'Go to Forms' }));
    expect(push).toHaveBeenCalledWith('/forms');
  });
});
