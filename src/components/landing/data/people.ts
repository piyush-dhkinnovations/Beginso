// Single identity map for every avatar on the landing page (mockup, feature
// cards, trust pill). The same person must have the same face everywhere —
// see the callers for how "team member" vs. "respondent" (role: null) are used.
export const PEOPLE = [
  { id: "alex", name: "Alex Rivera", role: "Owner", src: "/avatars/01.svg" },
  { id: "priya", name: "Priya Sharma", role: "Admin", src: "/avatars/02.svg" },
  { id: "sarah", name: "Sarah Lee", role: "Editor", src: "/avatars/03.svg" },
  { id: "marcus", name: "Marcus Lee", role: "Reviewer", src: "/avatars/04.svg" },
  { id: "amelia", name: "Amelia Ross", role: null, src: "/avatars/05.svg" },
  { id: "chidi", name: "Chidi Okafor", role: null, src: "/avatars/06.svg" },
  { id: "tom", name: "Tom Becker", role: null, src: "/avatars/07.svg" },
  { id: "noah", name: "Noah Fischer", role: null, src: "/avatars/08.svg" },
  { id: "lena", name: "Lena Ortiz", role: null, src: "/avatars/09.svg" },
  { id: "kelly", name: "Kelly Park", role: null, src: "/avatars/10.svg" },
] as const;

export type Person = (typeof PEOPLE)[number];
export type PersonId = Person["id"];

const BY_ID = new Map(PEOPLE.map((p) => [p.id, p]));

export function personById(id: PersonId): Person {
  const person = BY_ID.get(id);
  if (!person) throw new Error(`Unknown person id: ${id}`);
  return person;
}
