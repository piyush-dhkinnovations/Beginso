'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { publicFormService } from '@/services/publicForm';

// The respondent opened the link in their "confirm your email" message. Confirming is the whole job: the form tab they came
// from notices on its own (it is waiting for exactly this), so the page only says what happened and sends them back to it.
type State = 'working' | 'verified' | 'expired' | 'invalid' | 'error';

const COPY: Record<Exclude<State, 'working'>, { title: string; body: string }> = {
  verified: { title: 'Your email is confirmed', body: 'Go back to the form: it will show your email as verified, and you can finish and submit.' },
  expired: { title: 'This link has expired', body: 'Go back to the form and press Resend to get a new link.' },
  invalid: { title: 'This link does not work', body: 'It may have been mistyped or already replaced. Go back to the form and press Verify again.' },
  error: { title: 'We could not confirm your email', body: 'Something went wrong on our side. Please open the link again in a moment.' },
};

export default function ConfirmEmailPage() {
  const params = useParams<{ token: string }>();
  const [token] = useState(params.token);
  const [state, setState] = useState<State>('working');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // React strict mode runs effects twice in dev; one confirmation is enough
    started.current = true;
    publicFormService
      .confirmEmailVerification(token)
      .then(setState)
      .catch(() => setState('error'));
    // keep the one-time link out of the address bar and history
    window.history.replaceState(null, '', '/confirm-email');
  }, [token]);

  const Icon = state === 'verified' ? CheckCircle2 : state === 'expired' ? Clock : XCircle;
  const tone = state === 'verified' ? 'text-(--success-text)' : 'text-(--text-muted)';

  return (
    <main className="min-h-screen bg-(--bg-subtle) flex justify-center p-4">
      <div className="w-full max-w-md self-start py-10">
        <Card className="flex flex-col items-center gap-3 p-8 text-center" aria-live="polite">
          {state === 'working' ? (
            <p role="status" className="bg-body text-(--text-muted)">Confirming your email…</p>
          ) : (
            <>
              <Icon size={36} className={tone} aria-hidden="true" />
              <h1 className="bg-h4 font-bold text-(--text-primary)">{COPY[state].title}</h1>
              <p className="bg-body text-(--text-muted)">{COPY[state].body}</p>
              <Button variant="secondary" onClick={() => window.close()}>
                Close this tab
              </Button>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
