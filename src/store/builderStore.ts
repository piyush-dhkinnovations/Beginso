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
    set(() => ({
      formTitle: title,
      dirty: true,
    })),

  addField: () => {},
  reorderFields: () => {},
  updateField: () => {},
  softDeleteField: () => {},
  setActiveFieldId: (fieldId) => set({ activeFieldId: fieldId }),
  undo: () => {},
  redo: () => {},
  markSaved: () => set({ dirty: false }),
}));
