import { publicFormSlug } from '@/lib/publicFormUrl';
import { wouldCreateCycle } from '@/lib/logicGraph';
import { create } from 'zustand';
import type {
  Form,
  FormField,
  FieldType,
  FormBranding,
  FormPage,
  FormSettings,
  FormStatus,
  LogicRule,
} from '@/types/form';

// Snapshot captures everything undo/redo needs to restore the full editor state.
// Page titles/descriptions live inside `pages`, so no separate fields are needed for them.
interface BuilderSnapshot {
  fields: FormField[];
  formTitle: string;
  pages: FormPage[];
}

export interface BuilderState {
  formId: string | null;
  formTitle: string;          // user-facing name — top bar / Forms Manager
  fields: FormField[];
  pages: FormPage[];          // always at least one page; each carries its own title/description
  activePageId: string | null; // which page's fields the canvas currently shows
  activeFieldId: string | null;
  dirty: boolean;
  undoStack: BuilderSnapshot[];
  redoStack: BuilderSnapshot[];
  branding: FormBranding;
  settings: FormSettings;
  status: FormStatus;
  slug: string | undefined;
  // Set by Sidebar when it intercepts a nav-link click while dirty; the builder page
  // watches this to open the same Leave-Builder modal used for its own Back button.
  pendingLeaveUrl: string | null;
  // Optimistic concurrency: the server's contentVersion this editor is based on, sent with every save. A 409 FORM_STALE
  // sets `stale`: another tab or person saved first, so saving stops until the user reloads.
  contentVersion: number | null;
  stale: boolean;
  // undoStack depth at the last successful save: how many edits are unsaved is the difference.
  savedUndoDepth: number;

  initForm: (form: Form) => void;
  setContentVersion: (contentVersion: number) => void;
  markStale: () => void;
  setFormTitle: (title: string) => void;
  addField: (type: FieldType, insertIndex?: number) => void;
  duplicateField: (fieldId: string) => void;
  reorderFields: (activeId: string, overId: string) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  softDeleteField: (fieldId: string) => void;
  setActiveFieldId: (fieldId: string | null) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  setBranding: (updates: Partial<FormBranding>) => void;
  setSettings: (updates: Partial<FormSettings>) => void;
  setStatus: (status: FormStatus, slug?: string) => void;
  updateFieldOptions: (fieldId: string, options: string[]) => void;
  addLogicRule: (fieldId: string, rule: LogicRule) => void;
  updateLogicRule: (oldFieldId: string, oldRuleIndex: number, newFieldId: string, rule: LogicRule) => void;
  deleteLogicRule: (fieldId: string, ruleIndex: number) => void;
  setActivePageId: (pageId: string) => void;
  addPage: () => void;
  setPageTitle: (pageId: string, title: string) => void;
  setPageDescription: (pageId: string, description: string) => void;
  deletePage: (pageId: string) => void;
  setPendingLeaveUrl: (url: string | null) => void;
}

// Helper to push a full-state snapshot to the undoStack (capped at 50) and clear the redoStack
function pushSnapshot(fields: FormField[], formTitle: string, pages: FormPage[], undoStack: BuilderSnapshot[]) {
  // ponytail: O(N) full deep clone ceiling. Safe for MVP, but memory/perf trap for huge forms.
  // Upgrade path: replace with minimal JSON patches or immer.
  const snapshot: BuilderSnapshot = {
    fields: structuredClone(fields),
    formTitle,
    pages: structuredClone(pages),
  };
  const newUndoStack = [...undoStack, snapshot].slice(-50);
  return {
    undoStack: newUndoStack,
    redoStack: [] as BuilderSnapshot[],
  };
}

const defaultLabelFor = (type: FieldType): string => {
  const labels: Record<FieldType, string> = {
    short_text: 'Short Text',
    long_text: 'Long Text',
    email: 'Email',
    phone: 'Phone',
    number: 'Number',
    date: 'Date',
    dropdown: 'Dropdown',
    multiple_choice: 'Multiple Choice',
    checkbox: 'Checkbox',
    file_upload: 'File Upload',
    rating: 'Rating',
    yes_no: 'Yes / No',
    url: 'Website',
    time: 'Time',
    datetime: 'Date & Time',
    currency: 'Amount',
    address: 'Address',
    signature: 'Signature',
    image_upload: 'Image Upload',
  };
  return labels[type] || 'New Field';
};

// Fields belonging to a single page, in display order (deleted fields excluded)
function pageFields(fields: FormField[], pageId: string): FormField[] {
  return fields.filter((f) => !f.deleted && f.pageId === pageId);
}

// Everything NOT in that page's visible set (other pages' fields + deleted fields of any page) —
// relative order among themselves is irrelevant since they're never rendered together.
function otherFields(fields: FormField[], pageId: string): FormField[] {
  return fields.filter((f) => f.deleted || f.pageId !== pageId);
}

export const useBuilderStore = create<BuilderState>((set) => ({
  formId: null,
  formTitle: '',
  fields: [],
  pages: [],
  activePageId: null,
  activeFieldId: null,
  dirty: false,
  undoStack: [],
  redoStack: [],
  branding: {},
  settings: { honeypotEnabled: true },
  status: 'draft',
  slug: undefined,
  pendingLeaveUrl: null,
  contentVersion: null,
  stale: false,
  savedUndoDepth: 0,

  setPendingLeaveUrl: (url) => set({ pendingLeaveUrl: url }),

  initForm: (form) =>
    set((state) => {
      // Backend may not have `pages` yet (pre-migration forms) — synthesize a single
      // default page so the rest of the app can always assume pages.length >= 1.
      const pages: FormPage[] =
        form.pages && form.pages.length > 0
          ? form.pages
          : [{ id: crypto.randomUUID(), order: 0 }];

      // Page 1 defaults its title to the user's form name so a freshly created form
      // isn't blank on first open — every page after that starts genuinely blank
      // (shows the "Untitled form" placeholder) until the user sets its own title.
      if (!pages[0].title) {
        pages[0] = { ...pages[0], title: form.title };
      }
      const defaultPageId = pages[0].id;

      // Backfill pageId on any field that predates the pages feature.
      const fields = (form.fields || []).map((f) =>
        f.pageId ? f : ({ ...f, pageId: defaultPageId } as FormField)
      );

      return {
        formId: form._id,
        formTitle: form.title,
        fields,
        pages,
        activePageId: defaultPageId,
        branding: form.branding ?? {},
        settings: form.settings ?? { honeypotEnabled: true },
        status: form.status,
        // The GET /api/forms/:id endpoint may not return `slug` even when the form is published
        // (only POST /publish does). Preserve whatever slug the store already has for this same
        // form so the Share tab stays functional after navigating away and back.
        slug: publicFormSlug(form) ?? (form.status === 'published' && state.formId === form._id ? state.slug : undefined),
        activeFieldId: null,
        dirty: false,
        undoStack: [],
        redoStack: [],
        contentVersion: form.contentVersion ?? 0,
        stale: false,
        savedUndoDepth: 0,
      };
    }),

  setFormTitle: (title) =>
    set((state) => ({
      ...pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack),
      formTitle: title,
      dirty: true,
    })),

  addField: (type, insertIndex) =>
    set((state) => {
      const activePageId = state.activePageId ?? state.pages[0]?.id;
      if (!activePageId) return {};

      const snapshot = pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack);
      const currentPageFields = pageFields(state.fields, activePageId);
      const defaultField: FormField = {
        fieldId: crypto.randomUUID(),
        pageId: activePageId,
        type,
        label: defaultLabelFor(type),
        placeholder: '',
        required: false,
        helpText: '',
        deleted: false,
        order: currentPageFields.length,
      } as FormField;

      // Choice field default options config
      if (type === 'dropdown' || type === 'multiple_choice' || type === 'checkbox') {
        (defaultField as Extract<FormField, { options: string[] }>).options = ['Option 1'];
      }

      // Display & preview settings are stored explicitly on creation, so a later change to the
      // defaults can never silently re-render responses to a form that was built before it.
      if (type === 'image_upload') {
        Object.assign(defaultField, { allowMultiple: false, previewPosition: 'top', aspectRatio: 'original', previewSize: 'large' });
      } else if (type === 'url') {
        Object.assign(defaultField, { urlPreviewStyle: 'rich', urlDisplay: 'card' });
      } else if (type === 'currency') {
        Object.assign(defaultField, { currency: 'INR' });
      }

      const newPageFields = [...currentPageFields];
      if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= newPageFields.length) {
        newPageFields.splice(insertIndex, 0, defaultField);
      } else {
        newPageFields.push(defaultField);
      }

      // Re-assign order based on the new in-page index sequence
      newPageFields.forEach((f, idx) => {
        f.order = idx;
      });

      const finalFields = [...newPageFields, ...otherFields(state.fields, activePageId)];

      return {
        ...snapshot,
        fields: finalFields,
        dirty: true,
      };
    }),

  duplicateField: (fieldId) =>
    set((state) => {
      const original = state.fields.find((f) => f.fieldId === fieldId);
      if (!original) return {};

      const currentPageFields = pageFields(state.fields, original.pageId);
      const originalIndex = currentPageFields.findIndex((f) => f.fieldId === fieldId);
      if (originalIndex === -1) return {};

      const snapshot = pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack);

      // Deep-clone so the duplicate's own arrays (e.g. choice options) never share a
      // reference with the original — editing one must never silently edit the other.
      // logicRules is dropped: those rules describe *this* field as the source, and
      // copying them would make the duplicate silently drive the same target field.
      const { logicRules: _logicRules, ...clonedBase } = structuredClone(currentPageFields[originalIndex]);
      const duplicate = {
        ...clonedBase,
        fieldId: crypto.randomUUID(),
        label: `${clonedBase.label} (Copy)`,
      } as FormField;

      const newPageFields = [...currentPageFields];
      newPageFields.splice(originalIndex + 1, 0, duplicate);
      newPageFields.forEach((f, idx) => {
        f.order = idx;
      });

      const rest = otherFields(state.fields, original.pageId);

      // Incoming rules (other fields' rules whose targetFieldId is the original) live on
      // the SOURCE field, not the original — duplicating only copied the original's own
      // fields, so they never followed. Without this, the duplicate silently loses whatever
      // show/hide condition governed the original (the source field can be on either page).
      const withIncomingRulesCopied = (f: FormField): FormField => {
        const incoming = (f.logicRules ?? []).filter((r) => r.targetFieldId === fieldId);
        if (incoming.length === 0) return f;
        const cloned = structuredClone(incoming).map((r) => ({ ...r, targetFieldId: duplicate.fieldId }));
        return { ...f, logicRules: [...(f.logicRules ?? []), ...cloned] } as FormField;
      };

      const finalFields = [...newPageFields.map(withIncomingRulesCopied), ...rest.map(withIncomingRulesCopied)];

      return {
        ...snapshot,
        fields: finalFields,
        activeFieldId: duplicate.fieldId,
        dirty: true,
      };
    }),

  reorderFields: (activeId, overId) =>
    set((state) => {
      if (activeId === overId) return {};

      const activeField = state.fields.find((f) => f.fieldId === activeId);
      if (!activeField) return {};
      const pageId = activeField.pageId;

      const snapshot = pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack);
      const currentPageFields = pageFields(state.fields, pageId);
      const activeIndex = currentPageFields.findIndex((f) => f.fieldId === activeId);
      const overIndex = currentPageFields.findIndex((f) => f.fieldId === overId);

      if (activeIndex === -1 || overIndex === -1) return {};

      const newPageFields = [...currentPageFields];
      const [removed] = newPageFields.splice(activeIndex, 1);
      newPageFields.splice(overIndex, 0, removed);

      // Re-assign order based on the new in-page index sequence
      newPageFields.forEach((f, idx) => {
        f.order = idx;
      });

      const finalFields = [...newPageFields, ...otherFields(state.fields, pageId)];

      return {
        ...snapshot,
        fields: finalFields,
        dirty: true,
      };
    }),

  updateField: (fieldId, updates) =>
    set((state) => {
      const fieldIndex = state.fields.findIndex((f) => f.fieldId === fieldId);
      if (fieldIndex === -1) return {};

      // Check if a value actually changed to prevent duplicate clean updates
      const currentField = state.fields[fieldIndex];
      const hasChanges = Object.keys(updates).some((key) => {
        const k = key as keyof FormField;
        return currentField[k] !== updates[k];
      });

      if (!hasChanges) return {};

      const updatedFields = state.fields.map((f) => {
        if (f.fieldId === fieldId) {
          return { ...f, ...updates } as FormField;
        }
        return f;
      });

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack),
        fields: updatedFields,
        dirty: true,
      };
    }),

  softDeleteField: (fieldId) =>
    set((state) => {
      const fieldIndex = state.fields.findIndex((f) => f.fieldId === fieldId);
      if (fieldIndex === -1) return {};

      // Rules that decide this field's visibility, and this field's own rules, are meaningless once it is gone.
      // They are dropped here (undo restores them with the field) instead of lingering on other fields' cards.
      const updatedFields = state.fields.map((f) => {
        if (f.fieldId === fieldId) {
          return { ...f, deleted: true, logicRules: [] } as FormField;
        }
        if (f.logicRules?.some((r) => r.targetFieldId === fieldId)) {
          return { ...f, logicRules: f.logicRules.filter((r) => r.targetFieldId !== fieldId) } as FormField;
        }
        return f;
      });

      const nextActiveFieldId = state.activeFieldId === fieldId ? null : state.activeFieldId;

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack),
        fields: updatedFields,
        activeFieldId: nextActiveFieldId,
        dirty: true,
      };
    }),

  setActiveFieldId: (fieldId) =>
    set({
      activeFieldId: fieldId,
    }),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return {};
      const prev = state.undoStack[state.undoStack.length - 1];
      // If the page the user is currently looking at no longer exists in the
      // restored state, fall back to the restored form's first page.
      const activePageId = prev.pages.some((p) => p.id === state.activePageId)
        ? state.activePageId
        : prev.pages[0]?.id ?? null;
      return {
        fields: structuredClone(prev.fields),
        formTitle: prev.formTitle,
        pages: structuredClone(prev.pages),
        activePageId,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [
          { fields: structuredClone(state.fields), formTitle: state.formTitle, pages: structuredClone(state.pages) },
          ...state.redoStack,
        ],
        dirty: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return {};
      const next = state.redoStack[0];
      const activePageId = next.pages.some((p) => p.id === state.activePageId)
        ? state.activePageId
        : next.pages[0]?.id ?? null;
      return {
        fields: structuredClone(next.fields),
        formTitle: next.formTitle,
        pages: structuredClone(next.pages),
        activePageId,
        undoStack: [
          ...state.undoStack,
          { fields: structuredClone(state.fields), formTitle: state.formTitle, pages: structuredClone(state.pages) },
        ],
        redoStack: state.redoStack.slice(1),
        dirty: true,
      };
    }),

  markSaved: () =>
    set((state) => ({
      dirty: false,
      savedUndoDepth: state.undoStack.length,
    })),

  setContentVersion: (contentVersion) => set({ contentVersion }),
  markStale: () => set({ stale: true }),

  setBranding: (updates) =>
    set((state) => ({
      branding: { ...state.branding, ...updates },
      dirty: true,
    })),

  setSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
      dirty: true,
    })),

  setStatus: (status, slug) =>
    set({ status, ...(slug ? { slug } : {}) }),

  updateFieldOptions: (fieldId, options) =>
    set((state) => {
      // Guard: never allow an empty options array — no-op instead
      if (options.length === 0) return {};
      const fieldIndex = state.fields.findIndex((f) => f.fieldId === fieldId);
      if (fieldIndex === -1) return {};

      const oldOptions = (state.fields[fieldIndex] as Extract<FormField, { options: string[] }>).options ?? [];

      // A logic rule's condition.value is a plain string snapshot of the option text at the
      // time the rule was authored — renaming an option in place doesn't touch it, so the
      // rule silently stops matching anything (same failure mode as a deleted source field,
      // but with no warning shown for it). Detected as an exact 1-for-1 swap in the option
      // set (add/delete/reorder don't produce that shape); rewrite affected rules to follow it.
      const removed = oldOptions.filter((o) => !options.includes(o));
      const added = options.filter((o) => !oldOptions.includes(o));
      const renamedFrom = removed.length === 1 && added.length === 1 ? removed[0] : null;
      const renamedTo = added[0];

      const updatedFields = state.fields.map((f) => {
        const base = f.fieldId === fieldId ? ({ ...f, options } as FormField) : f;
        if (renamedFrom && base.logicRules?.some((r) => r.condition.fieldId === fieldId && r.condition.value === renamedFrom)) {
          const rules = base.logicRules.map((r) =>
            r.condition.fieldId === fieldId && r.condition.value === renamedFrom
              ? { ...r, condition: { ...r.condition, value: renamedTo } }
              : r
          );
          return { ...base, logicRules: rules } as FormField;
        }
        return base;
      });

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack),
        fields: updatedFields,
        dirty: true,
      };
    }),

  addLogicRule: (fieldId, rule) =>
    set((state) => {
      // Guard: target field can never be the source field
      if (rule.targetFieldId === fieldId) return {};
      // Guard: a rule that closes a loop (A shows B, B shows A) would hide both fields forever
      if (wouldCreateCycle(state.fields, fieldId, rule.targetFieldId)) return {};
      const fieldIndex = state.fields.findIndex((f) => f.fieldId === fieldId);
      if (fieldIndex === -1) return {};

      const updatedFields = state.fields.map((f) => {
        if (f.fieldId !== fieldId) return f;
        const existingRules = f.logicRules ?? [];
        return { ...f, logicRules: [...existingRules, rule] } as FormField;
      });

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack),
        fields: updatedFields,
        dirty: true,
      };
    }),

  updateLogicRule: (oldFieldId, oldRuleIndex, newFieldId, rule) =>
    set((state) => {
      // Guard: target field can never be the (possibly new) source field
      if (rule.targetFieldId === newFieldId) return {};
      // Guard: no loops. The rule being replaced does not count: it is about to disappear.
      const withoutOld = state.fields.map((f) =>
        f.fieldId === oldFieldId ? ({ ...f, logicRules: (f.logicRules ?? []).filter((_, i) => i !== oldRuleIndex) } as FormField) : f
      );
      if (wouldCreateCycle(withoutOld, newFieldId, rule.targetFieldId)) return {};
      const oldFieldIndex = state.fields.findIndex((f) => f.fieldId === oldFieldId);
      const newFieldIndex = state.fields.findIndex((f) => f.fieldId === newFieldId);
      if (oldFieldIndex === -1 || newFieldIndex === -1) return {};

      // Editing the "If field" moves the rule to a different field's logicRules array;
      // keeping it on the same field replaces it in place at the same index.
      const updatedFields = state.fields.map((f) => {
        if (f.fieldId === oldFieldId && f.fieldId === newFieldId) {
          const rules = [...(f.logicRules ?? [])];
          rules[oldRuleIndex] = rule;
          return { ...f, logicRules: rules } as FormField;
        }
        if (f.fieldId === oldFieldId) {
          const rules = (f.logicRules ?? []).filter((_, i) => i !== oldRuleIndex);
          return { ...f, logicRules: rules } as FormField;
        }
        if (f.fieldId === newFieldId) {
          return { ...f, logicRules: [...(f.logicRules ?? []), rule] } as FormField;
        }
        return f;
      });

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack),
        fields: updatedFields,
        dirty: true,
      };
    }),

  deleteLogicRule: (fieldId, ruleIndex) =>
    set((state) => {
      const fieldIndex = state.fields.findIndex((f) => f.fieldId === fieldId);
      if (fieldIndex === -1) return {};

      const updatedFields = state.fields.map((f) => {
        if (f.fieldId !== fieldId || !f.logicRules) return f;
        const updatedRules = f.logicRules.filter((_, i) => i !== ruleIndex);
        return { ...f, logicRules: updatedRules } as FormField;
      });

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack),
        fields: updatedFields,
        dirty: true,
      };
    }),

  // ─── Pages ────────────────────────────────────────────────────────────────

  setActivePageId: (pageId) =>
    set({
      activePageId: pageId,
    }),

  addPage: () =>
    set((state) => {
      // Deliberately blank — new pages must never inherit another page's title/description.
      const newPage: FormPage = {
        id: crypto.randomUUID(),
        order: state.pages.length,
      };

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack),
        pages: [...state.pages, newPage],
        activePageId: newPage.id,
        dirty: true,
      };
    }),

  setPageTitle: (pageId, title) =>
    set((state) => {
      const page = state.pages.find((p) => p.id === pageId);
      if (!page) return {};
      if ((page.title ?? '') === title) return {};

      const updatedPages = state.pages.map((p) => (p.id === pageId ? { ...p, title } : p));

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack),
        pages: updatedPages,
        dirty: true,
      };
    }),

  setPageDescription: (pageId, description) =>
    set((state) => {
      const page = state.pages.find((p) => p.id === pageId);
      if (!page) return {};
      if ((page.description ?? '') === description) return {};

      const updatedPages = state.pages.map((p) => (p.id === pageId ? { ...p, description } : p));

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack),
        pages: updatedPages,
        dirty: true,
      };
    }),

  deletePage: (pageId) =>
    set((state) => {
      // A form must always have at least one page — refuse to delete the last one.
      if (state.pages.length <= 1) return {};
      const pageIndex = state.pages.findIndex((p) => p.id === pageId);
      if (pageIndex === -1) return {};

      const remainingPages = state.pages.filter((p) => p.id !== pageId);
      // Re-assign order sequentially — otherwise a later addPage() (which sets
      // order: pages.length) can collide with a surviving page's now-stale order value.
      remainingPages.forEach((p, idx) => {
        p.order = idx;
      });
      // Merge the deleted page's fields onto the nearest remaining page (the one before it,
      // or the new first page if it was page 1) so nothing is silently lost.
      const targetPage = remainingPages[Math.max(0, pageIndex - 1)] ?? remainingPages[0];

      const targetExisting = pageFields(state.fields, targetPage.id);
      const merged = state.fields
        .filter((f) => !f.deleted && f.pageId === pageId)
        .map((f) => ({ ...f, pageId: targetPage.id }) as FormField);
      const mergedPageFields = [...targetExisting, ...merged];
      mergedPageFields.forEach((f, idx) => {
        f.order = idx;
      });

      const untouched = state.fields.filter((f) => f.deleted || (f.pageId !== targetPage.id && f.pageId !== pageId));
      const finalFields = [...mergedPageFields, ...untouched];

      const nextActivePageId = state.activePageId === pageId ? targetPage.id : state.activePageId;

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.pages, state.undoStack),
        pages: remainingPages,
        fields: finalFields,
        activePageId: nextActivePageId,
        dirty: true,
      };
    }),
}));
