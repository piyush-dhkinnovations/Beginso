import { create } from 'zustand';
import type { Form, FormField, FieldType } from '@/types/form';

export interface BuilderState {
  formId: string | null;
  formTitle: string;
  fields: FormField[];
  activeFieldId: string | null;
  dirty: boolean;
  undoStack: FormField[][];
  redoStack: FormField[][];

  initForm: (form: Form) => void;
  setFormTitle: (title: string) => void;
  addField: (type: FieldType) => void;
  reorderFields: (activeId: string, overId: string) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  softDeleteField: (fieldId: string) => void;
  setActiveFieldId: (fieldId: string | null) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
}

// Helper to push a clone of current fields to the undoStack (capped at 50) and clear the redoStack
function pushSnapshot(fields: FormField[], undoStack: FormField[][]) {
  const snapshot = structuredClone(fields);
  const newUndoStack = [...undoStack, snapshot].slice(-50);
  return {
    undoStack: newUndoStack,
    redoStack: [],
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

  initForm: (form) =>
    set({
      formId: form._id,
      formTitle: form.title,
      fields: form.fields || [],
      activeFieldId: null,
      dirty: false,
      undoStack: [],
      redoStack: [],
    }),

  setFormTitle: (title) =>
    set((state) => ({
      ...pushSnapshot(state.fields, state.undoStack),
      formTitle: title,
      dirty: true,
    })),

  addField: (type) =>
    set((state) => {
      const defaultField: FormField = {
        fieldId: crypto.randomUUID(),
        type,
        label: defaultLabelFor(type),
        placeholder: '',
        required: false,
        helpText: '',
        deleted: false,
        order: state.fields.filter((f) => !f.deleted).length,
      } as FormField;

      // Choice field default options config
      if (type === 'dropdown' || type === 'multiple_choice' || type === 'checkbox') {
        (defaultField as Extract<FormField, { options: string[] }>).options = ['Option 1'];
      }

      return {
        ...pushSnapshot(state.fields, state.undoStack),
        fields: [...state.fields, defaultField],
        dirty: true,
      };
    }),

  reorderFields: (activeId, overId) =>
    set((state) => {
      if (activeId === overId) return {};

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
        ...pushSnapshot(state.fields, state.undoStack),
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
        ...pushSnapshot(state.fields, state.undoStack),
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
        ...pushSnapshot(state.fields, state.undoStack),
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
        fields: structuredClone(prev),
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [structuredClone(state.fields), ...state.redoStack],
        dirty: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return {};
      const next = state.redoStack[0];
      return {
        fields: structuredClone(next),
        undoStack: [...state.undoStack, structuredClone(state.fields)],
        redoStack: state.redoStack.slice(1),
        dirty: true,
      };
    }),

  markSaved: () =>
    set({
      dirty: false,
    }),
}));
