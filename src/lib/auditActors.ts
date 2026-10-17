export interface AuditActorSource {
  id: string;
  name: string;
  email?: string;
}

/**
 * Labels for the Audit Log's Actor filter. Two members can share a display name ("test", "test"): the filter then could not be told
 * apart, so a name that appears more than once gets the person's email after it. Unique names stay as they are.
 */
export function disambiguateActors(people: AuditActorSource[]): { id: string; name: string }[] {
  const seen = new Map<string, number>();
  for (const p of people) {
    const key = p.name.trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return people.map((p) => {
    const shared = (seen.get(p.name.trim().toLowerCase()) ?? 0) > 1;
    return { id: p.id, name: shared && p.email ? `${p.name} (${p.email})` : p.name };
  });
}
