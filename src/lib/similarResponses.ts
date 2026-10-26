/** The Responses list of a form with its search box filled in with one email address: every response from that address. */
export function similarResponsesHref(scope: string, formId: string, email: string): string {
  const params = new URLSearchParams();
  if (scope !== 'personal') params.set('ws', scope);
  params.set('q', email);
  return `/forms/${formId}/inbox?${params.toString()}`;
}
