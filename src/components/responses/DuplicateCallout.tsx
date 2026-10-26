'use client';

import { useQuery } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { responsesService } from '@/services/responses';

export interface DuplicateCalloutProps {
  /** The email address the other responses share with this one (the only thing the duplicate check compares). */
  email?: string;
  formId?: string;
  scope: string;
  /** Shows every response with this email in the Responses list (search filled in, this response closed). */
  onSeeAll: (email: string) => void;
}

/**
 * Shown in `WorkflowSidebar` when the server flagged the response as a duplicate. The check only compares the email address, so the
 * answers may well differ: this says "similar", not "duplicate", and one click lists every response from that email so the person
 * can compare them side by side instead of guessing which one is the original.
 */
export function DuplicateCallout({ email, formId, scope, onSeeAll }: DuplicateCalloutProps) {
  // How many responses carry this email (this one included): one cheap request for the count only.
  const { data } = useQuery({
    queryKey: ['responses-same-email', scope, formId, email],
    queryFn: () => responsesService.getResponses({ formId, search: email, page: 1, limit: 1 }, scope),
    enabled: !!email,
    staleTime: 30_000,
  });
  const total = data?.total;

  return (
    <div className="flex items-start gap-2 rounded-md border border-(--warning-border) bg-(--warning-surface) px-3 py-2 bg-body-sm text-(--text-secondary)">
      <Copy size={14} className="mt-0.5 shrink-0 text-(--text-muted)" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span>
          <strong className="font-semibold text-(--text-primary)">Similar response.</strong>{' '}
          {email ? (
            <>
              {total && total > 1 ? `${total - 1} other ${total - 1 === 1 ? 'response uses' : 'responses use'}` : 'Another response uses'} the same email address. The answers may be different.
            </>
          ) : (
            'Another response was sent from the same email address. The answers may be different.'
          )}
        </span>
        {email && (
          <Button variant="secondary" size="small" className="self-start" onClick={() => onSeeAll(email)}>
            Show all with this email{total ? ` (${total})` : ''}
          </Button>
        )}
      </div>
    </div>
  );
}
