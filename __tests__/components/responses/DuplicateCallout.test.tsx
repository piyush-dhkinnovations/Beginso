import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DuplicateCallout } from '@/components/responses/DuplicateCallout';
import { similarResponsesHref } from '@/lib/similarResponses';

const getResponses = vi.hoisted(() => vi.fn());
vi.mock('@/services/responses', () => ({ responsesService: { getResponses } }));

const draw = (props: Partial<React.ComponentProps<typeof DuplicateCallout>> = {}) => {
  const onSeeAll = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DuplicateCallout email="piyush270205@gmail.com" formId="f1" scope="personal" onSeeAll={onSeeAll} {...props} />
    </QueryClientProvider>,
  );
  return onSeeAll;
};

describe('DuplicateCallout', () => {
  beforeEach(() => getResponses.mockReset().mockResolvedValue({ data: [], total: 4, page: 1, limit: 1, totalPages: 4 }));

  it('says "similar", not "duplicate": the check only compares the email address, so the answers may differ', async () => {
    draw();
    expect(screen.getByText('Similar response.')).toBeInTheDocument();
    expect(await screen.findByText(/3 other responses use the same email address/)).toBeInTheDocument();
    expect(screen.getByText(/The answers may be different/)).toBeInTheDocument();
    expect(screen.queryByText(/duplicate/i)).not.toBeInTheDocument();
  });

  it('one click lists every response from that email, and says how many there are', async () => {
    const onSeeAll = draw();
    const button = await screen.findByRole('button', { name: 'Show all with this email (4)' });
    await userEvent.click(button);
    expect(onSeeAll).toHaveBeenCalledWith('piyush270205@gmail.com');
    expect(getResponses).toHaveBeenCalledWith(expect.objectContaining({ formId: 'f1', search: 'piyush270205@gmail.com', limit: 1 }), 'personal');
  });

  it('with no email on the response it still explains, and offers no button', () => {
    draw({ email: undefined });
    expect(screen.getByText(/same email address/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(getResponses).not.toHaveBeenCalled();
  });
});

describe('similarResponsesHref', () => {
  it('opens the form\'s Responses with the email in the search box, keeping the workspace', () => {
    expect(similarResponsesHref('personal', 'f1', 'a+b@x.com')).toBe('/forms/f1/inbox?q=a%2Bb%40x.com');
    expect(similarResponsesHref('acme', 'f1', 'a@x.com')).toBe('/forms/f1/inbox?ws=acme&q=a%40x.com');
  });
});
