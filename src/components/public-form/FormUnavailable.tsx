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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-card p-8 max-w-[520px] w-full text-center">
        <Lock size={48} className="text-neutral-400 mx-auto mb-4" />
        <h1 className="text-heading-1 text-neutral-900 mb-2">
          This form is not currently accepting responses.
        </h1>
        <p className="text-body text-neutral-500">
          If you believe this is an error, please contact the form owner.
        </p>
        {userNote && (
          <p className="text-body-sm text-neutral-400 mt-4">{userNote}</p>
        )}
      </div>
    </div>
  );
}
