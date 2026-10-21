'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { publicFormService } from '@/services/publicForm';

// "Anyone with the link, with their email": the respondent proves they own the address BEFORE submitting. They press Verify, an email
// with a confirm button is sent, they click it (usually in another tab), and this hook - polling while the email is pending - sees the
// address turn verified. The id the backend returns is the proof that THIS browser asked; it is kept for the tab's lifetime so a reload
// does not lose a verification that is already done.
export type VerifyStatus = 'idle' | 'sending' | 'pending' | 'verified' | 'expired' | 'error';

const POLL_MS = 3000;
export const RESEND_AFTER_MS = 30_000;

const storageKey = (slug: string) => `beginso:email-verification:${slug}`;
const normalise = (email: string) => email.trim().toLowerCase();

interface Stored {
  email: string;
  id: string;
}
function readStored(slug: string): Stored | null {
  try {
    const raw = sessionStorage.getItem(storageKey(slug));
    const v = raw ? (JSON.parse(raw) as Stored) : null;
    return v && typeof v.email === 'string' && typeof v.id === 'string' ? v : null;
  } catch {
    return null;
  }
}
function writeStored(slug: string, value: Stored | null) {
  try {
    if (value) sessionStorage.setItem(storageKey(slug), JSON.stringify(value));
    else sessionStorage.removeItem(storageKey(slug));
  } catch {
    /* private window: the verification then lasts until the page is reloaded, which is fine */
  }
}

export interface EmailVerification {
  status: VerifyStatus;
  /** The address the current request is for (normalised), or null. */
  email: string | null;
  /** The proof to send with the submit; only set once the address is verified. */
  verificationId: string | null;
  message: string | null;
  /** When the last email was sent, for the resend cooldown. */
  sentAt: number | null;
  send: (email: string) => Promise<void>;
  /** Forget everything (after a successful submit). */
  clear: () => void;
}

/**
 * @param currentEmail what is typed in the email field right now. Changing it to a different address drops the verification:
 *                     it was for the old one.
 */
export function useEmailVerification(slug: string, enabled: boolean, currentEmail: string): EmailVerification {
  const [status, setStatus] = useState<VerifyStatus>('idle');
  const [email, setEmail] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const idRef = useRef<string | null>(null);
  const current = normalise(currentEmail);

  const reset = useCallback(
    (keepMessage = false) => {
      idRef.current = null;
      setStatus('idle');
      setEmail(null);
      setVerificationId(null);
      setSentAt(null);
      if (!keepMessage) setMessage(null);
      writeStored(slug, null);
    },
    [slug]
  );

  // Pick up a request this tab already made (a reload while waiting for the email, or after verifying).
  useEffect(() => {
    if (!enabled) return;
    const stored = readStored(slug);
    if (!stored) return;
    let cancelled = false;
    publicFormService
      .getEmailVerification(slug, stored.id)
      .then((r) => {
        if (cancelled) return;
        if (r.status === 'verified' || r.status === 'pending') {
          idRef.current = stored.id;
          setEmail(stored.email);
          setVerificationId(r.status === 'verified' ? stored.id : null);
          setStatus(r.status);
        } else {
          writeStored(slug, null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug, enabled]);

  // The respondent changed the address: what was verified or sent was for the old one, so it no longer counts (derived, not reset:
  // typing the old address back restores it, and a different one simply starts again).
  const stale = !!email && current !== email;

  // While the email is pending, look for the click: on a timer, and the moment the tab is shown again.
  useEffect(() => {
    if (status !== 'pending' || stale) return;
    let stopped = false;
    const check = () => {
      const id = idRef.current;
      if (!id) return;
      publicFormService
        .getEmailVerification(slug, id)
        .then((r) => {
          if (stopped) return;
          if (r.status === 'verified') {
            setVerificationId(id);
            setStatus('verified');
          } else if (r.status === 'expired') {
            setStatus('expired');
            setMessage('That link expired. Send a new one.');
          } else if (r.status === 'invalid') {
            reset();
          }
        })
        .catch(() => {});
    };
    const timer = setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [status, stale, slug, reset]);

  const send = useCallback(
    async (address: string) => {
      const target = normalise(address);
      setStatus('sending');
      setMessage(null);
      try {
        const { verificationId: id } = await publicFormService.requestEmailVerification(slug, target);
        idRef.current = id;
        setEmail(target);
        setVerificationId(null);
        setSentAt(Date.now());
        setStatus('pending');
        writeStored(slug, { email: target, id });
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'We could not send the verification email. Please try again.');
      }
    },
    [slug]
  );

  const clear = useCallback(() => reset(), [reset]);

  return stale
    ? { status: 'idle', email: null, verificationId: null, message: null, sentAt: null, send, clear }
    : { status, email, verificationId, message, sentAt, send, clear };
}
