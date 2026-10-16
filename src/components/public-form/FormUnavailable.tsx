import { StateArt } from '@/components/illustrations/Illustration';
import { Lock } from 'lucide-react';
import { UNAVAILABLE_COPY, type FormUnavailableReason } from '@/lib/formUnavailable';

interface FormUnavailableProps {
  /** User-provided note (from settings.successMessage) — only shown for closed forms. */
  userNote?: string;
  /** The slug resolves to no public form at all (wrong or retired link) — distinct from a closed form. */
  notFound?: boolean;
  /** The owner closed it, its closing date passed, or its response limit was reached: each gets its own message. */
  reason?: FormUnavailableReason;
}

/**
 * Shown for closed or nonexistent forms. A form the owner closed (by hand, by closing date, or by response limit) says
 * which. A draft and a link that never existed stay indistinguishable (Requirement 7.4): both use the notFound variant,
 * so it never confirms that a draft exists.
 */
export function FormUnavailable({ userNote, notFound, reason }: FormUnavailableProps) {
  const copy = UNAVAILABLE_COPY[reason ?? (notFound ? 'notFound' : 'generic')];
  return (
    <main className="min-h-screen bg-(--bg-subtle) flex items-center justify-center p-4">
      <div className="bg-(--surface-card) rounded-xl border border-(--border-default) shadow-(--shadow-sm) p-8 max-w-130 w-full text-center">
        <StateArt name="form-closed" fallback={<Lock size={48} className="text-(--text-disabled) mx-auto mb-4" />} />
        <h1 className="bg-h4 text-(--text-primary) mb-2">{copy.title}</h1>
        <p className="bg-body text-(--text-muted)">{copy.description}</p>
        {userNote && <p className="bg-body-sm text-(--text-disabled) mt-4">{userNote}</p>}
      </div>
    </main>
  );
}
