/**
 * Turns a response's raw answers (keyed by field label) plus its uploaded files into an ordered list the
 * response viewer can render field-by-field, using each field's own type and Display & Preview settings.
 * Pure — no React — so the matching rules live in one place.
 */

import { imageSettings, safeHttpUrl, urlSettings } from '@/lib/fieldDisplay';
import { buildAnswerKeyMap } from '@/lib/answerKeys';
import type { FormField, FormPage } from '@/types/form';
import type { AnswerValue, IResponseFile, ResponseAnswers } from '@/types/response';

export interface AnswerItem {
  key: string;
  /** Position in the form (1-based) — shown as "1. Event Banner", also for images pulled to the top. */
  number: number;
  label: string;
  /** Absent for an answer whose field was deleted or renamed — it is shown as plain text. */
  field?: FormField;
  value: AnswerValue;
  /** Uploaded files that belong to this answer (image_upload / file_upload). */
  files: IResponseFile[];
}

// The stored name is the last path segment of the file's URL (the backend sanitises it to [A-Za-z0-9._-]).
const storedName = (file: IResponseFile): string => file.url.split('?')[0].split('/').pop() ?? '';

// How a file answer is stored: `{ fileName, fileSize, mimeType }`.
const isFileRecord = (v: unknown): boolean => typeof v === 'object' && v !== null && 'fileName' in v;

/** An upload question's stored text that names no upload: it was answered while the question was another type. */
const isEarlierText = (v: unknown): boolean => (typeof v === 'string' && v !== '' && !v.includes('/upload')) || (Array.isArray(v) && v.length > 0);

export function buildAnswerItems(
  answers: ResponseAnswers,
  files: IResponseFile[],
  fields: FormField[] | undefined,
  pages: FormPage[] = [],
  /** Labels for uploaded files, in upload order — only used while the form definition is unavailable. */
  fileLabels: string[] = []
): AnswerItem[] {
  const claimed = new Set<string>();
  const items: Omit<AnswerItem, 'number'>[] = [];

  if (fields) {
    const pageOrder = new Map(pages.map((p) => [p.id, p.order]));
    // Two questions can share a label; each answer is filed under its own key ("Comment", "Comment (2)").
    const keys = buildAnswerKeyMap(fields);
    const keyOf = (f: FormField) => keys.get(f) ?? f.label;
    const ordered = fields
      .filter((f) => !f.deleted)
      .sort((a, b) => (pageOrder.get(a.pageId) ?? 0) - (pageOrder.get(b.pageId) ?? 0) || a.order - b.order);

    // Image answers name their files, so they are matched exactly. A question that was an image upload when it was
    // answered, and is something else now, keeps its images the same way.
    const named = new Map<string, IResponseFile[]>();
    for (const field of ordered) {
      const raw = answers[keyOf(field)];
      const matched = (Array.isArray(raw) ? raw : [])
        .map((name) => files.find((f) => !claimed.has(f.id) && storedName(f) === name))
        .filter((f): f is IResponseFile => !!f);
      matched.forEach((f) => claimed.add(f.id));
      named.set(field.fieldId, matched);
    }

    // A file_upload answer does not name its file, so the remaining files are handed out in field order.
    const remaining = files.filter((f) => !claimed.has(f.id));
    let fileIndex = 0;
    const known = new Set<string>();
    const result: Omit<AnswerItem, 'number'>[] = [];
    for (const field of ordered) {
      known.add(keyOf(field));
      const raw = answers[keyOf(field)];
      const matched = named.get(field.fieldId) ?? [];
      const base = { key: field.fieldId, label: field.label };
      const isUpload = field.type === 'file_upload' || field.type === 'image_upload';
      if (field.type === 'image_upload' && matched.length > 0) {
        result.push({ ...base, field, value: null, files: matched });
      } else if (matched.length > 0) {
        result.push({ ...base, value: null, files: matched });
      } else if (isUpload && isEarlierText(raw)) {
        result.push({ ...base, value: raw, files: [] });
      } else if (field.type === 'file_upload' || isFileRecord(raw)) {
        const file = remaining[fileIndex++];
        result.push({ ...base, field: field.type === 'file_upload' ? field : undefined, value: null, files: file ? [file] : [] });
      } else {
        result.push({ ...base, field, value: field.type === 'image_upload' ? null : raw ?? null, files: [] });
      }
    }
    // Answers whose field no longer exists are kept (never silently dropped).
    for (const [label, value] of Object.entries(answers)) {
      if (!known.has(label)) result.push({ key: `answer:${label}`, label, value, files: [] });
    }
    remaining.slice(fileIndex).forEach((file, i) =>
      result.push({ key: `file:${file.id}`, label: `Uploaded file ${fileIndex + i + 1}`, value: null, files: [file] })
    );
    return result.map((item, i) => ({ ...item, number: i + 1 }));
  }

  // The form definition is unavailable: show what the response itself carries.
  for (const [label, value] of Object.entries(answers)) items.push({ key: `answer:${label}`, label, value, files: [] });
  files.forEach((file, i) =>
    items.push({ key: `file:${file.id}`, label: fileLabels[i] ?? (files.length === 1 ? 'Uploaded file' : `Uploaded file ${i + 1}`), value: null, files: [file] })
  );
  return items.map((item, i) => ({ ...item, number: i + 1 }));
}

/** Images whose field is set to "Top of response" — rendered before the ordinary answers. */
export const isTopImage = (item: AnswerItem): boolean =>
  item.field?.type === 'image_upload' && imageSettings(item.field).previewPosition === 'top' && item.files.length > 0;

/** Links whose field is set to "Top of response". */
export const isTopUrl = (item: AnswerItem): boolean =>
  item.field?.type === 'url' && urlSettings(item.field).previewPosition === 'top' && safeHttpUrl(item.value) !== null;

export const isTopAnswer = (item: AnswerItem): boolean => isTopImage(item) || isTopUrl(item);
