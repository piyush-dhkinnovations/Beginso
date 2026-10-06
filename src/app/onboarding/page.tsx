'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth';
import { Button, Spinner } from '@/components/ui';

// There is no multi-step onboarding UI yet: an onboarding-incomplete user (authContext sends them
// here) is marked complete via the idempotent backend call and moved on. A user who is already
// onboarded is sent straight home. On failure the user gets a retry, never a redirect loop.
export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const complete = useCallback(async () => {
    try {
      await authService.completeOnboarding();
      router.replace('/dashboard');
    } catch {
      setFailed(true);
    }
  }, [router]);

  useEffect(() => {
    if (isLoading || !user || started.current) return;
    started.current = true;
    // setFailed only runs after the awaited call rejects, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user.onboardingCompleted === false) void complete();
    else router.replace('/dashboard');
  }, [isLoading, user, router, complete]);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-(--text-muted)">We could not finish setting up your account.</p>
        <Button onClick={() => {
          setFailed(false);
          void complete();
        }}>Try again</Button>
      </div>
    );
  }
  return <Spinner />;
}
