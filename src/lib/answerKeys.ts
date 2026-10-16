/**
 * The key a question's answer is stored under. The backend files answers by label and, since two questions can share a
 * label, gives the second one "Label (2)", the third "Label (3)" (skipping any real label that would collide). Keep this
 * in step with `buildAnswerKeyMap` in the backend (src/utils/answerKeys.ts): a form with no repeated labels maps every
 * question to its own label, as it always did.
 */
export interface KeyedField {
  label: string;
  fieldId?: string;
  deleted?: boolean;
}

export function buildAnswerKeyMap<F extends KeyedField>(fields: readonly F[] | undefined): Map<F, string> {
  const map = new Map<F, string>();
  const list = fields ?? [];
  const taken = new Set(list.map((f) => f.label.trim() || 'Untitled question'));
  const used = new Set<string>();
  for (const f of list) {
    const base = f.label.trim() || 'Untitled question';
    if (f.deleted) {
      map.set(f, f.label);
      continue;
    }
    let key = f.label;
    if (used.has(key)) {
      let n = 2;
      while (used.has(`${base} (${n})`) || taken.has(`${base} (${n})`)) n++;
      key = `${base} (${n})`;
    }
    used.add(key);
    map.set(f, key);
  }
  return map;
}

/** The key for one question of `fields` (found by identity, then by field id). */
export function answerKeyOf<F extends KeyedField>(fields: readonly F[] | undefined, field: F): string {
  const list = fields ?? [];
  const map = buildAnswerKeyMap(list);
  const hit = list.find((f) => f === field || (!!f.fieldId && f.fieldId === field.fieldId));
  return (hit && map.get(hit)) || field.label;
}
