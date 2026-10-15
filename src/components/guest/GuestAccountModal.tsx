'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { authService } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';

export const CLAIM_PATH = '/forms/claim';
const next = encodeURIComponent(CLAIM_PATH);

// The one place a guest meets the account wall. What happens next is real: signing up (or logging in) lands on
// /forms/claim, which asks before it copies the draft into the PERSONAL space as a draft form. It is saved there,
// not published, so the words here say "save".
export function GuestAccountModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { login } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const google = async () => {
    setBusy(true);
    setError(null);
    try {
      await authService.loginWithGoogle();
      await login(CLAIM_PATH);
    } catch (e) {
      setBusy(false);
      setError(getFriendlyErrorMessage(e));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save your form to a free account" description="Your form and its design move into your account. Use this same browser so we can find it.">
      <div className="flex flex-col gap-3">
        {error && <Alert variant="error" title="Could not continue">{error}</Alert>}
        <GoogleSignInButton onClick={() => void google()} isLoading={busy} />
        <Link href={`/signup?next=${next}`}>
          <Button variant="secondary" className="w-full min-h-11">Sign up with email</Button>
        </Link>
        <p className="bg-body-sm text-(--text-secondary)">
          Already have an account?{' '}
          <Link href={`/login?next=${next}`} className="font-medium text-(--text-link) underline underline-offset-2">Log in</Link>
        </p>
      </div>
    </Modal>
  );
}
