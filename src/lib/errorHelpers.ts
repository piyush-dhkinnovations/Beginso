/**
 * Translates Firebase and network errors into user-friendly messages.
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  // Cast error to safely read message properties
  const err = error as { message?: string; code?: string; response?: { data?: { error?: { message?: string } } } };

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

  return message || 'An unexpected error occurred. Please try again.';
}
