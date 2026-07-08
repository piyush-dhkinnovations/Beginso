import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useBuilderStore } from '@/store/builderStore';
import type { FieldType, Form } from '@/types/form';

const FIELD_TYPES: FieldType[] = [
  'short_text',
  'long_text',
  'email',
  'phone',
  'number',
  'date',
  'dropdown',
  'multiple_choice',
  'checkbox',
  'file_upload',
];

// UUID v4 pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Helper to mock a complete Form object
const mockForm = (id: string = 'test-form-id', title: string = 'Initial Title'): Form => ({
  _id: id,
  workspaceId: 'test-workspace',
  title: title,
  description: '',
  status: 'draft',
  fields: [],
  branding: {},
  settings: {
    honeypotEnabled: true,
  },
  schemaVersion: 1,
  responseCount: 0,
  createdAt: '2026-07-07T00:00:00Z',
  updatedAt: '2026-07-07T00:00:00Z',
});

describe('Zustand builderStore Property Tests', () => {
  beforeEach(() => {
    // Reset store state before each test run
    useBuilderStore.getState().initForm(mockForm());
  });

  // ─── Property 2: Undo/Redo Round-Trip ──────────────────────────────────────
  it('Property 2: Undo/redo round-trip preserves state updates', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...FIELD_TYPES), { minLength: 1, maxLength: 20 }), (types) => {
        const store = useBuilderStore.getState();
        
        // Reset state for properties run
        store.initForm(mockForm('test-form', 'My Form'));

        // Apply sequence of field additions
        types.forEach((type) => {
          store.addField(type);
        });

        const fieldsAfterAdditions = structuredClone(useBuilderStore.getState().fields);
        expect(fieldsAfterAdditions.length).toBe(types.length);

        // Undo all additions
        for (let i = 0; i < types.length; i++) {
          store.undo();
        }

        expect(useBuilderStore.getState().fields.length).toBe(0);

        // Redo all additions
        for (let i = 0; i < types.length; i++) {
          store.redo();
        }

        expect(useBuilderStore.getState().fields).toEqual(fieldsAfterAdditions);
      }),
      { numRuns: 100 }
    );
  });

  // ─── Property 3: 10-level Undo Depth ───────────────────────────────────────
  it('Property 3: 10-level undo depth returns to original state', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...FIELD_TYPES), { minLength: 10, maxLength: 10 }), (types) => {
        const store = useBuilderStore.getState();

        store.initForm(mockForm('test-form', 'My Form'));

        // Add 10 fields consecutively
        types.forEach((type) => {
          store.addField(type);
        });

        expect(useBuilderStore.getState().fields.length).toBe(10);

        // Undo exactly 10 times
        for (let i = 0; i < 10; i++) {
          store.undo();
        }

        expect(useBuilderStore.getState().fields.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  // ─── Property 4: Dirty Lifecycle Flag ──────────────────────────────────────
  it('Property 4: Dirty lifecycle changes appropriately on actions', () => {
    fc.assert(
      fc.property(fc.constantFrom(...FIELD_TYPES), (type) => {
        const store = useBuilderStore.getState();

        store.initForm(mockForm('test-form', 'My Form'));

        expect(useBuilderStore.getState().dirty).toBe(false);

        // Act: add a field
        store.addField(type);
        expect(useBuilderStore.getState().dirty).toBe(true);

        // Save form
        store.markSaved();
        expect(useBuilderStore.getState().dirty).toBe(false);

        // Act: update title
        store.setFormTitle('New Form Title');
        expect(useBuilderStore.getState().dirty).toBe(true);

        // Save form again
        store.markSaved();
        expect(useBuilderStore.getState().dirty).toBe(false);

        // Act: delete field
        const createdFieldId = useBuilderStore.getState().fields[0].fieldId;
        store.softDeleteField(createdFieldId);
        expect(useBuilderStore.getState().dirty).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  // ─── Property 5: Drag-from-toolbox Creates Valid Fields ──────────────────────
  it('Property 5: Drag-from-toolbox adds field with default schema validation', () => {
    fc.assert(
      fc.property(fc.constantFrom(...FIELD_TYPES), (type) => {
        const store = useBuilderStore.getState();

        store.initForm(mockForm('test-form', 'My Form'));

        const initialLength = useBuilderStore.getState().fields.length;
        store.addField(type);

        const fields = useBuilderStore.getState().fields;
        expect(fields.length).toBe(initialLength + 1);

        const addedField = fields[fields.length - 1];
        expect(addedField.fieldId).toMatch(UUID_REGEX);
        expect(addedField.type).toBe(type);
        expect(addedField.deleted).toBe(false);
        expect(addedField.required).toBe(false);
        expect(typeof addedField.label).toBe('string');
        expect(addedField.label.length).toBeGreaterThan(0);
        expect(addedField.placeholder).toBe('');
        expect(addedField.helpText).toBe('');
      }),
      { numRuns: 100 }
    );
  });
});
