// A person's initials get a colour of their own, the same everywhere (Respondent column, assignee, members, notes) instead of one blue
// for everybody. The colour comes from the name, so it never changes between renders, pages or sessions. Eighteen hues, spread so that
// two neighbours in a list rarely look alike.
const HUES = [210, 340, 150, 28, 262, 190, 8, 95, 300, 45, 230, 172, 120, 320, 70, 250, 14, 200] as const;

/** A stable hue (0 to 360) for a name, or undefined when there is no name to colour. */
export function avatarHue(name: string | null | undefined): number | undefined {
  const key = name?.trim().toLowerCase();
  if (!key) return undefined;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash + key.charCodeAt(i)) >>> 0;
  return HUES[hash % HUES.length];
}
