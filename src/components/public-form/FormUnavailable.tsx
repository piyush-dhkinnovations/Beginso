import { StateArt } from '@/components/illustrations/Illustration';
import { Lock } from 'lucide-react';

interface FormUnavailableProps {
  /** User-provided note (from settings.successMessage) — only shown for closed forms. */
  userNote?: string;
}

/**
 * Shown for draft, closed, or nonexistent forms. Deliberately identical in all
 * three cases — never reveals which one it is (Requirement 7.4).
 */
export function FormUnavailable({ userNote }: FormUnavailableProps) {
  return (
    <div className="min-h-screen bg-(--bg-subtle) flex items-center justify-center p-4">
      <div className="bg-(--surface-card) rounded-xl border border-(--border-default) shadow-(--shadow-sm) p-8 max-w-130 w-full text-center">
        <StateArt name="form-closed" fallback={<Lock size={48} className="text-(--text-disabled) mx-auto mb-4" />} />
        <h1 className="bg-h4 text-(--text-primary) mb-2">
          This form is not currently accepting responses.
        </h1>
        <p className="bg-body text-(--text-muted)">
          If you believe this is an error, please contact the form owner.
        </p>
        {userNote && (
          <p className="bg-body-sm text-(--text-disabled) mt-4">{userNote}</p>
        )}
      </div>
    </div>
  );
}
