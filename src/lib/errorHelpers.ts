/** An error whose message was written for the user and is shown verbatim by getFriendlyErrorMessage. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export interface FriendlyErrorOptions {
  /** What the user was doing, as a verb phrase: "delete this form". Makes 403/404 messages specific. */
  action?: string;
  /** Used instead of the generic sentence when nothing more specific is known. */
  fallback?: string;
}

/**
 * HTTP-status -> sentence, the single place the toast layer gets 401/403/404/409/422/5xx wording
 * from. 403 names what the user lacks ("You don't have permission to delete this form").
 */
export function messageForStatus(status: number | undefined, { action, fallback }: FriendlyErrorOptions = {}): string | undefined {
  if (!status) return undefined;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403)
    return action
      ? `You don't have permission to ${action}. Ask a workspace owner or admin for access.`
      : "You don't have permission to do that. Ask a workspace owner or admin for access.";
  if (status === 404) return action ? `Couldn't ${action}: it no longer exists or was moved.` : 'That item no longer exists or was moved.';
  if (status === 409) return 'This conflicts with a recent change (someone else may have just updated it). Refresh and try again.';
  if (status === 400 || status === 422) return fallback ?? 'Some of the details are not valid. Check them and try again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return undefined;
}

/**
 * Translates Firebase, backend and network errors into user-friendly messages.
 */
export function getFriendlyErrorMessage(error: unknown, options: FriendlyErrorOptions = {}): string {
  if (!error) return options.fallback ?? 'An unexpected error occurred. Please try again.';
  if (error instanceof UserFacingError) return error.message;

  const err = error as {
    message?: string;
    code?: string;
    response?: { status?: number; data?: { message?: string; error?: { message?: string; code?: string } } };
  };

  // Backend error codes with a fixed, user-facing sentence (API_CONTRACT.md "Error codes"). Checked
  // before the raw backend message so the wording stays ours, and 429 works whatever its body says.
  const apiCode = err.response?.data?.error?.code;
  const codeMessages: Record<string, string> = {
    RATE_LIMITED: 'You are doing that too often. Please wait a moment and try again.',
    ADMIN_REQUIRES_OWNER: 'Only the workspace owner can change or remove an admin.',
    LAST_OWNER: 'You are the only owner. Transfer ownership to another member before leaving.',
    PAYLOAD_TOO_LARGE: 'That submission is too large. Please shorten your answers or remove large attachments.',
    ALREADY_MEMBER: 'That person is already a member of this workspace.',
    INVITATION_ALREADY_PENDING: 'An invitation for this email is already pending. Try again in a moment.',
    REPORT_QUEUE_FULL: 'Several reports are already being prepared. Wait for one to finish, then try again.',
    OWNS_SHARED_WORKSPACES: 'You still own a workspace that other people belong to. Transfer ownership or remove them first.',
    REAUTH_REQUIRED: 'Please confirm your password to continue.',
    REAUTH_INVALID: 'We could not confirm your password. Please try again.',
    REAUTH_MISMATCH: 'That confirmation belongs to a different account.',
    REAUTH_EXPIRED: 'Your password confirmation expired. Please try again.',
    TOKEN_REVOKED: 'Your session was ended. Please sign in again.',
  };
  if (apiCode && codeMessages[apiCode]) return codeMessages[apiCode];
  if (err.response?.status === 429) return codeMessages.RATE_LIMITED;
  if (err.response?.status === 413) return codeMessages.PAYLOAD_TOO_LARGE;

  // Prioritize backend-provided API errors if they exist
  const apiMessage = err.response?.data?.error?.message;
  if (apiMessage) {
    // Some backend error paths put the machine-readable code straight into the message
    // field (confirmed live: a suspended login returns message: "ACCOUNT_SUSPENDED", not
    // a sentence) — translate the ones we know about rather than showing raw codes to users.
    const knownCodes: Record<string, string> = {
      ACCOUNT_SUSPENDED: 'Your account has been suspended. Please contact support for assistance.',
    };
    if (knownCodes[apiMessage]) {
      return knownCodes[apiMessage];
    }
    return apiMessage;
  }

  // The backend sometimes sends only a top-level `message`. Safe to show for 4xx (written for users);
  // 5xx text is never shown - it can be an internal error string.
  const status = err.response?.status;
  const topMessage = err.response?.data?.message;
  if (status && status >= 400 && status < 500 && status !== 401 && status !== 403 && typeof topMessage === 'string' && topMessage.length < 200 && !/^[A-Z_]+$/.test(topMessage)) {
    return topMessage;
  }
  const byStatus = messageForStatus(status, options);
  if (byStatus) return byStatus;

  const message = err.message || '';

  // Translate common Firebase Auth error codes
  if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (message.includes('auth/email-already-in-use')) {
    return 'This email address is already in use. Please log in instead.';
  }
  if (message.includes('auth/too-many-requests')) {
    return 'Too many failed login attempts. Access has been temporarily disabled. Please try again later.';
  }
  if (message.includes('auth/weak-password')) {
    return 'Password is too weak. Please choose a stronger password.';
  }
  if (message.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('auth/network-request-failed') || message.includes('Network Error') || message.includes('ERR_CONNECTION_REFUSED')) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }
  if (message.includes('auth/popup-blocked')) {
    return 'Google sign-in was blocked by the browser. Allow pop-ups for this site and try again.';
  }
  if (message.includes('auth/popup-closed-by-user') || message.includes('auth/cancelled-popup-request')) {
    return 'Google sign-in was cancelled. Please try again when you are ready.';
  }
  if (message.includes('auth/unauthorized-domain')) {
    return 'Google sign-in is not enabled for this domain. Please contact support.';
  }
  if (message.includes('auth/internal-error')) {
    return 'Google sign-in could not start. Please refresh the page and try again.';
  }

  // Format any raw Firebase error to be cleaner: e.g. "Firebase: Error (auth/invalid-email)." -> "auth/invalid-email"
  const cleanMatch = message.match(/Firebase: Error \((.*?)\)\.?/);
  if (cleanMatch && cleanMatch[1]) {
    return cleanMatch[1].replace('auth/', '').replace(/-/g, ' ');
  }

  return options.fallback ?? (message || 'An unexpected error occurred. Please try again.');
}
