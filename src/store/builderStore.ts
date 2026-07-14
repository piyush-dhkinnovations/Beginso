import { create } from 'zustand';
import type {
  Form,
  FormField,
  FieldType,
  FormBranding,
  FormSettings,
  FormStatus,
  LogicRule,
} from '@/types/form';

// Snapshot captures both fields and title so undo/redo restores the full editor state
interface BuilderSnapshot {
  fields: FormField[];
  formTitle: string;
}

export interface BuilderState {
  formId: string | null;
  formTitle: string;
  fields: FormField[];
  activeFieldId: string | null;
  dirty: boolean;
  undoStack: BuilderSnapshot[];
  redoStack: BuilderSnapshot[];
  branding: FormBranding;
  settings: FormSettings;
  status: FormStatus;
  slug: string | undefined;

  initForm: (form: Form) => void;
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
  deleteLogicRule: (fieldId: string, ruleIndex: number) => void;
}

// Helper to push a snapshot of current fields + title to the undoStack (capped at 50) and clear the redoStack
function pushSnapshot(fields: FormField[], formTitle: string, undoStack: BuilderSnapshot[]) {
  // ponytail: O(N) full deep clone ceiling. Safe for MVP, but memory/perf trap for huge forms.
  // Upgrade path: replace with minimal JSON patches or immer.
  const snapshot: BuilderSnapshot = { fields: structuredClone(fields), formTitle };
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
  };
  return labels[type] || 'New Field';
};

export const useBuilderStore = create<BuilderState>((set) => ({
  formId: null,
  formTitle: '',
  fields: [],
  activeFieldId: null,
  dirty: false,
  undoStack: [],
  redoStack: [],
  branding: {},
  settings: { honeypotEnabled: true },
  status: 'draft',
  slug: undefined,

  initForm: (form) =>
    set({
      formId: form._id,
      formTitle: form.title,
      fields: form.fields || [],
      branding: form.branding ?? {},
      settings: form.settings ?? { honeypotEnabled: true },
      status: form.status,
      slug: form.slug,
      activeFieldId: null,
      dirty: false,
      undoStack: [],
      redoStack: [],
    }),

  setFormTitle: (title) =>
    set((state) => ({
      ...pushSnapshot(state.fields, state.formTitle, state.undoStack),
      formTitle: title,
      dirty: true,
    })),

  addField: (type, insertIndex) =>
    set((state) => {
      const snapshot = pushSnapshot(state.fields, state.formTitle, state.undoStack);
      const visibleFields = state.fields.filter((f) => !f.deleted);
      const defaultField: FormField = {
        fieldId: crypto.randomUUID(),
        type,
        label: defaultLabelFor(type),
        placeholder: '',
        required: false,
        helpText: '',
        deleted: false,
        order: visibleFields.length,
      } as FormField;

      // Choice field default options config
      if (type === 'dropdown' || type === 'multiple_choice' || type === 'checkbox') {
        (defaultField as Extract<FormField, { options: string[] }>).options = ['Option 1'];
      }

      let newVisible = [...visibleFields];
      if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= newVisible.length) {
        newVisible.splice(insertIndex, 0, defaultField);
      } else {
        newVisible.push(defaultField);
      }

      // Re-assign order based on the new visible index sequence
      newVisible.forEach((f, idx) => {
        f.order = idx;
      });

      const finalFields = [
        ...newVisible,
        ...state.fields.filter((f) => f.deleted),
      ];

      return {
        ...snapshot,
        fields: finalFields,
        dirty: true,
      };
    }),

  duplicateField: (fieldId) =>
    set((state) => {
      const visibleFields = state.fields.filter((f) => !f.deleted);
      const originalIndex = visibleFields.findIndex((f) => f.fieldId === fieldId);
      if (originalIndex === -1) return {};

      const snapshot = pushSnapshot(state.fields, state.formTitle, state.undoStack);

      // Deep-clone so the duplicate's own arrays (e.g. choice options) never share a
      // reference with the original — editing one must never silently edit the other.
      // logicRules is dropped: those rules describe *this* field as the source, and
      // copying them would make the duplicate silently drive the same target field.
      const { logicRules: _logicRules, ...clonedBase } = structuredClone(visibleFields[originalIndex]);
      const duplicate = {
        ...clonedBase,
        fieldId: crypto.randomUUID(),
        label: `${clonedBase.label} (Copy)`,
      } as FormField;

      const newVisible = [...visibleFields];
      newVisible.splice(originalIndex + 1, 0, duplicate);
      newVisible.forEach((f, idx) => {
        f.order = idx;
      });

      const finalFields = [
        ...newVisible,
        ...state.fields.filter((f) => f.deleted),
      ];

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

      const snapshot = pushSnapshot(state.fields, state.formTitle, state.undoStack);
      const visibleFields = state.fields.filter((f) => !f.deleted);
      const activeIndex = visibleFields.findIndex((f) => f.fieldId === activeId);
      const overIndex = visibleFields.findIndex((f) => f.fieldId === overId);

      if (activeIndex === -1 || overIndex === -1) return {};

      const newVisible = [...visibleFields];
      const [removed] = newVisible.splice(activeIndex, 1);
      newVisible.splice(overIndex, 0, removed);

      // Re-assign order based on the new visible index sequence
      newVisible.forEach((f, idx) => {
        f.order = idx;
      });

      // Reconstruct final fields: visible ordered ones first, followed by deleted ones
      const finalFields = [
        ...newVisible,
        ...state.fields.filter((f) => f.deleted),
      ];

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
        ...pushSnapshot(state.fields, state.formTitle, state.undoStack),
        fields: updatedFields,
        dirty: true,
      };
    }),

  softDeleteField: (fieldId) =>
    set((state) => {
      const fieldIndex = state.fields.findIndex((f) => f.fieldId === fieldId);
      if (fieldIndex === -1) return {};

      const updatedFields = state.fields.map((f) => {
        if (f.fieldId === fieldId) {
          return { ...f, deleted: true } as FormField;
        }
        return f;
      });

      const nextActiveFieldId = state.activeFieldId === fieldId ? null : state.activeFieldId;

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.undoStack),
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
      return {
        fields: structuredClone(prev.fields),
        formTitle: prev.formTitle,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [{ fields: structuredClone(state.fields), formTitle: state.formTitle }, ...state.redoStack],
        dirty: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return {};
      const next = state.redoStack[0];
      return {
        fields: structuredClone(next.fields),
        formTitle: next.formTitle,
        undoStack: [...state.undoStack, { fields: structuredClone(state.fields), formTitle: state.formTitle }],
        redoStack: state.redoStack.slice(1),
        dirty: true,
      };
    }),

  markSaved: () =>
    set({
      dirty: false,
    }),

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

      const updatedFields = state.fields.map((f) =>
        f.fieldId === fieldId ? ({ ...f, options } as FormField) : f
      );

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.undoStack),
        fields: updatedFields,
        dirty: true,
      };
    }),

  addLogicRule: (fieldId, rule) =>
    set((state) => {
      // Guard: target field can never be the source field
      if (rule.targetFieldId === fieldId) return {};
      const fieldIndex = state.fields.findIndex((f) => f.fieldId === fieldId);
      if (fieldIndex === -1) return {};

      const updatedFields = state.fields.map((f) => {
        if (f.fieldId !== fieldId) return f;
        const existingRules = f.logicRules ?? [];
        return { ...f, logicRules: [...existingRules, rule] } as FormField;
      });

      return {
        ...pushSnapshot(state.fields, state.formTitle, state.undoStack),
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
        ...pushSnapshot(state.fields, state.formTitle, state.undoStack),
        fields: updatedFields,
        dirty: true,
      };
    }),
}));
