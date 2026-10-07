'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { respondentService } from '@/services/respondent';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { SubmissionView } from '@/components/respondent/SubmissionView';

// Sprint 13 (A5.3 / A5.4). Four link states with their own screens: valid, expired, used, invalid. The page says
// what the link allows and when it expires. An account is OFFERED, never forced, and only ever created from here.
export default function RespondLinkPage() {
  const params = useParams<{ token: string }>();
  // Captured once: the address bar is stripped below, so the token has to live in state, not the URL.
  const [token] = useState(params.token);
  const tokenRef = useRef(token);
  const { toast } = useToast();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['respond-link'],
    queryFn: () => respondentService.getLink(tokenRef.current),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Strip a VALID token from the address bar so it is not left in history or screenshots; the ref keeps it. An invalid
  // or failed link keeps its token in the URL so the visitor can see/fix a typo and reload.
  useEffect(() => {
    if (query.data && query.data.view.state !== 'invalid') window.history.replaceState(null, '', '/r');
  }, [query.data]);

  const claim = useMutation({
    mutationFn: () => respondentService.claim(tokenRef.current),
    onSuccess: ({ linked }) => toast(`Linked ${linked} submission${linked === 1 ? '' : 's'} to your account`, 'success'),
    onError: (err) => toast(getFriendlyErrorMessage(err), 'error'),
  });
  const [resent, setResent] = useState(false);

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-(--bg-subtle) flex justify-center p-4">
      <div className="w-full max-w-xl self-start flex flex-col gap-4 py-6">{children}</div>
    </main>
  );

  if (query.isLoading) {
    return shell(
      <Card aria-label="Loading your submission">
        <Skeleton variant="title" width="50%" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="70%" />
      </Card>
    );
  }
  if (query.isError || !query.data) {
    return shell(
      <Alert variant="error" title="We could not load this.">
        Try the link again.{' '}
        <Button size="small" variant="secondary" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </Alert>
    );
  }

  const { view } = query.data;
  const nextPath = encodeURIComponent(`/r/${token}`);

  if (view.state === 'invalid') {
    return shell(
      <Card className="text-center">
        <h1 className="bg-h4 font-bold">This link is not valid</h1>
        <p className="bg-body text-(--text-muted) mt-1">It may have been replaced by a newer one. Check your email for the latest link.</p>
      </Card>
    );
  }

  if (view.state === 'expired') {
    return shell(
      <Card className="flex flex-col gap-3 text-center">
        <h1 className="bg-h4 font-bold">This link has expired</h1>
        <p className="bg-body text-(--text-muted)">Request a new one and we will email it to the address you used.</p>
        {resent ? (
          <p role="status" className="bg-body-sm text-(--success-text)">
            If we have a submission for that address, a new link is on its way.
          </p>
        ) : (
          view.formSlug && (
            <ResendForm
              onSend={async (email) => {
                await respondentService.resend(email, view.formSlug as string);
                setResent(true);
              }}
            />
          )
        )}
      </Card>
    );
  }

  if (view.state === 'used') {
    return shell(
      <Card className="flex flex-col gap-3 text-center">
        <h1 className="bg-h4 font-bold">You already have an account</h1>
        <p className="bg-body text-(--text-muted)">Sign in to see and edit all your submissions.</p>
        <Link href={`/login?next=${encodeURIComponent('/my-submissions')}`}>
          <Button className="min-h-11">Sign in</Button>
        </Link>
      </Card>
    );
  }

  const expires = view.expiresAt ? new Date(view.expiresAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : null;
  const emailMatches = !!user && !!view.email && user.email.toLowerCase() === view.email.toLowerCase();

  return shell(
    <>
      <div>
        <h1 className="bg-h3 font-bold text-(--text-primary)">{view.formName}</h1>
        <p className="bg-body-sm text-(--text-muted) mt-1">
          This link lets you view{view.canEdit ? ' and correct' : ''} your own submission only.
          {expires && ` It expires on ${expires}.`}
        </p>
      </div>
      <SubmissionView
        fields={view.fields ?? []}
        status={view.status}
        canEdit={!!view.canEdit}
        readOnlyReason={view.readOnlyReason}
        onSave={async (answers) => {
          const r = await respondentService.editViaLink(tokenRef.current, answers);
          if (!r.ok) throw new Error(r.message ?? 'We could not save your changes.');
          void query.refetch();
          return { editedAfterReview: r.editedAfterReview };
        }}
      />
      {/* Offered, never forced: the link keeps working until it expires whatever is chosen here. */}
      <Card className="flex flex-col gap-2 max-w-160">
        <h2 className="bg-h5 font-semibold">Keep all your submissions in one place</h2>
        <p className="bg-body-sm text-(--text-muted)">
          Optional. Create an account{view.email ? ` for ${view.email}` : ''} to see everything you have submitted. We never create one for you.
        </p>
        {emailMatches ? (
          <Button onClick={() => claim.mutate()} isLoading={claim.isPending} disabled={claim.isSuccess} className="min-h-11 self-start">
            {claim.isSuccess ? 'Linked' : 'Link my submissions to my account'}
          </Button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Link href={`/signup?next=${nextPath}`}>
              <Button className="min-h-11">Create an account</Button>
            </Link>
            {view.accountExists && (
              <Link href={`/login?next=${nextPath}`}>
                <Button variant="secondary" className="min-h-11">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        )}
      </Card>
    </>
  );
}

function ResendForm({ onSend }: { onSend: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end text-left"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSend(email.trim());
        setBusy(false);
      }}
    >
      <div className="flex-1">
        <Input id="resend-email" label="Your email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button type="submit" isLoading={busy} className="min-h-11">
        Send me a new link
      </Button>
    </form>
  );
}
