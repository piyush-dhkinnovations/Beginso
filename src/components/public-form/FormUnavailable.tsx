import { StateArt } from '@/components/illustrations/Illustration';
import { Lock } from 'lucide-react';

interface FormUnavailableProps {
  /** User-provided note (from settings.successMessage) — only shown for closed forms. */
  userNote?: string;
  /** The slug resolves to no public form at all (wrong or retired link) — distinct from a closed form. */
  notFound?: boolean;
}

/**
 * Shown for draft, closed, or nonexistent forms. Draft and nonexistent forms
 * stay indistinguishable (Requirement 7.4): the notFound variant is used for any 404 without a closed-form
 * note, so it never confirms that a draft exists.
 */
export function FormUnavailable({ userNote, notFound }: FormUnavailableProps) {
  return (
    <div className="min-h-screen bg-(--bg-subtle) flex items-center justify-center p-4">
      <div className="bg-(--surface-card) rounded-xl border border-(--border-default) shadow-(--shadow-sm) p-8 max-w-130 w-full text-center">
        <StateArt name="form-closed" fallback={<Lock size={48} className="text-(--text-disabled) mx-auto mb-4" />} />
        <h1 className="bg-h4 text-(--text-primary) mb-2">
          {notFound ? 'Form not found' : 'This form is not currently accepting responses.'}
        </h1>
        <p className="bg-body text-(--text-muted)">
          {notFound
            ? 'Check the link you were given, or contact the person who shared it.'
            : 'If you believe this is an error, please contact the form owner.'}
        </p>
        {userNote && (
          <p className="bg-body-sm text-(--text-disabled) mt-4">{userNote}</p>
        )}
      </div>
    </div>
  );
}
