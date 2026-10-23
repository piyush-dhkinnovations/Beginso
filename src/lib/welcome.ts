/** The heading of both Home pages (personal and workspace): "Welcome back, Piyush", or just "Welcome back" until the name is known. */
export const welcomeTitle = (fullName?: string | null): string => {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? `Welcome back, ${first}` : 'Welcome back';
};

export const WELCOME_DESCRIPTION = 'Your forms and activity at a glance.';
