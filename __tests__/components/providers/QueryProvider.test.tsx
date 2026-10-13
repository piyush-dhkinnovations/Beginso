import { describe, it, expect, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { QueryProvider } from '@/components/providers/QueryProvider';

const holder: { client?: QueryClient } = {};
function Probe() {
  const qc = useQueryClient();
  useEffect(() => {
    holder.client = qc;
  });
  return <p>child</p>;
}

describe('QueryProvider', () => {
  it('renders its children inside a query client', () => {
    render(<QueryProvider><Probe /></QueryProvider>);
    expect(screen.getByText('child')).toBeInTheDocument();
    expect(holder.client).toBeDefined();
  });

  it('applies the app-wide query defaults', () => {
    render(<QueryProvider><Probe /></QueryProvider>);
    const d = holder.client!.getDefaultOptions().queries!;
    expect(d.staleTime).toBe(30_000);
    expect(d.gcTime).toBe(300_000);
    expect(d.refetchOnWindowFocus).toBe(false);
  });

  it('keeps the same client across re-renders', () => {
    const { rerender } = render(<QueryProvider><Probe /></QueryProvider>);
    const first = holder.client;
    rerender(<QueryProvider><Probe /></QueryProvider>);
    expect(holder.client).toBe(first);
  });

  function retryFn() {
    render(<QueryProvider><Probe /></QueryProvider>);
    return holder.client!.getDefaultOptions().queries!.retry as (n: number, e: unknown) => boolean;
  }

  it('never retries a 4xx response', () => {
    const retry = retryFn();
    for (const status of [400, 401, 403, 404]) {
      expect(retry(0, new AxiosError('x', 'E', undefined, undefined, { status } as AxiosResponse))).toBe(false);
    }
  });

  it('retries a 5xx or network error once', () => {
    const retry = retryFn();
    const e500 = new AxiosError('x', 'E', undefined, undefined, { status: 500 } as AxiosResponse);
    expect(retry(0, e500)).toBe(true);
    expect(retry(1, e500)).toBe(false);
    const network = new AxiosError('Network Error');
    expect(retry(0, network)).toBe(true);
    expect(retry(0, new Error('plain'))).toBe(true);
    expect(retry(1, new Error('plain'))).toBe(false);
  });

  it('does not refetch a failing 404 query', async () => {
    const fn = vi.fn().mockRejectedValue(new AxiosError('x', 'E', undefined, undefined, { status: 404 } as AxiosResponse));
    function Failing() {
      const q = useQuery({ queryKey: ['t'], queryFn: fn });
      return <p>{q.isError ? 'failed' : 'loading'}</p>;
    }
    render(<QueryProvider><Failing /></QueryProvider>);
    await waitFor(() => expect(screen.getByText('failed')).toBeInTheDocument());
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
