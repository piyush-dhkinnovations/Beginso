'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import { sanitizeNextParam } from '@/lib/authRoutes';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth';
import { settingsService } from '@/services/settings';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { Alert, Button, Input, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

// The Beginso avatar set in /public/avatars.
const AVATARS = Array.from({ length: 10 }, (_, i) => `/avatars/${String(i + 1).padStart(2, '0')}.svg`);

// The one onboarding step: what to call you, and which Beginso avatar is yours. An onboarded user is sent straight on.
// Skipping still completes onboarding, so nobody is ever stuck behind this page.
function OnboardingContent() {
  const router = useRouter();
  // Where the person was heading before onboarding interrupted (e.g. /templates/apply/<id>); the dashboard otherwise.
  const home = sanitizeNextParam(useSearchParams().get('next')) ?? '/dashboard';
  const { user, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.onboardingCompleted !== false) {
      router.replace(home);
      return;
    }
    if (!seeded) {
      // Start from the name they signed up with; they can change it.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds the field once the user has loaded
      setName(user.name ?? '');
      setSeeded(true);
    }
  }, [isLoading, user, router, home, seeded]);

  const trimmed = name.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 100;

  const finish = async (save: boolean) => {
    setBusy(true);
    setError(null);
    try {
      // avatarUrl must be an absolute URL; the avatars are served by this app.
      if (save) await settingsService.updateProfile({ name: trimmed, avatarUrl: `${window.location.origin}${avatar}` });
      await authService.completeOnboarding();
      router.replace(home);
    } catch (e) {
      setBusy(false);
      setError(getFriendlyErrorMessage(e, { action: 'save your profile', fallback: 'We could not save your profile. Please try again.' }));
    }
  };

  if (isLoading || !user || user.onboardingCompleted !== false) return <Spinner />;

  return (
    // The layout already centres this and shows the logo, so this is just the card.
    <div className="flex flex-col gap-8 rounded-(--bg-radius-lg) border border-(--border-default) bg-(--surface-card) p-6 shadow-(--shadow-sm) sm:p-8">
        <div>
          <h1 className="bg-h3 text-(--text-primary)">Welcome to Beginso</h1>
          <p className="mt-2 bg-body-lg text-(--text-secondary)">Tell us what to call you and pick an avatar. You can change both later in Settings.</p>
        </div>

        <form
          className="flex flex-col gap-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !busy) void finish(true);
          }}
        >
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- local static SVG avatar */}
            <img src={avatar} alt="" className="size-20 shrink-0 rounded-full border border-(--border-default) bg-(--surface-card)" />
            <div className="min-w-0 flex-1">
              <Input id="onboarding-name" label="Your name" value={name} maxLength={100} autoComplete="name" autoFocus onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" error={name.length > 0 && !valid ? 'Use at least 2 characters.' : undefined} />
            </div>
          </div>

          <fieldset>
            <legend className="bg-label mb-3">Choose your avatar</legend>
            <div className="grid grid-cols-5 gap-3" role="radiogroup" aria-label="Avatar">
              {AVATARS.map((src, i) => {
                const on = avatar === src;
                return (
                  <button
                    key={src}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`Avatar ${i + 1}`}
                    onClick={() => setAvatar(src)}
                    className={cn('relative aspect-square rounded-full border-2 p-0.5 transition-colors', on ? 'border-(--border-focus)' : 'border-transparent hover:border-(--border-strong)')}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- local static SVG avatar */}
                    <img src={src} alt="" className="size-full rounded-full" />
                    {on && (
                      <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-(--action-primary) text-(--text-on-brand)">
                        <Check size={12} aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && <Alert variant="error" title="Not saved">{error}</Alert>}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!valid || busy} isLoading={busy}>Continue</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void finish(false)}>Skip for now</Button>
          </div>
        </form>
    </div>
  );
}

// useSearchParams() (?next=) needs a Suspense boundary during prerender.
export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}
