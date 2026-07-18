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
  pages: [],
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

  // ─── duplicateField: clones in-place, deep-copies arrays, drops logicRules ───
  it('duplicateField inserts a deep-cloned copy right after the original and drops its logicRules', () => {
    const store = useBuilderStore.getState();
    store.initForm(mockForm('test-form', 'My Form'));

    store.addField('dropdown');
    store.addField('short_text');
    let fields = useBuilderStore.getState().fields;
    const dropdownId = fields[0].fieldId;
    const shortTextId = fields[1].fieldId;

    store.updateFieldOptions(dropdownId, ['A', 'B']);
    store.updateField(dropdownId, { label: 'Pick one', required: true });
    store.addLogicRule(dropdownId, {
      condition: { fieldId: dropdownId, operator: 'equals', value: 'A' },
      action: 'show',
      targetFieldId: shortTextId,
    });

    const original = useBuilderStore.getState().fields.find((f) => f.fieldId === dropdownId)!;

    store.duplicateField(dropdownId);
    fields = useBuilderStore.getState().fields;

    expect(fields.length).toBe(3);
    const duplicate = fields[1]; // inserted immediately after the original at index 0
    expect(duplicate.fieldId).toMatch(UUID_REGEX);
    expect(duplicate.fieldId).not.toBe(dropdownId);
    expect(duplicate.label).toBe('Pick one (Copy)');
    expect(duplicate.required).toBe(true);
    expect((duplicate as { options: string[] }).options).toEqual(['A', 'B']);
    expect((duplicate as { options: string[] }).options).not.toBe(
      (original as { options: string[] }).options
    );
    expect(duplicate.logicRules ?? []).toEqual([]);

    // Order is reassigned sequentially across all visible fields
    expect(fields.map((f) => f.order)).toEqual([0, 1, 2]);

    // The original is untouched — still has its own logic rule
    const originalAfter = fields.find((f) => f.fieldId === dropdownId)!;
    expect(originalAfter.logicRules).toHaveLength(1);

    // The new duplicate is auto-selected
    expect(useBuilderStore.getState().activeFieldId).toBe(duplicate.fieldId);

    // Mutating the duplicate's options must never affect the original's
    store.updateFieldOptions(duplicate.fieldId, ['A', 'B', 'C']);
    const originalStillTwo = useBuilderStore.getState().fields.find((f) => f.fieldId === dropdownId)!;
    expect((originalStillTwo as { options: string[] }).options).toEqual(['A', 'B']);
  });

  // ─── updateLogicRule: in-place replace vs. relocate across a source-field change ─
  it('updateLogicRule replaces in place when the source field is unchanged, and relocates the rule when it is', () => {
    const store = useBuilderStore.getState();
    store.initForm(mockForm('test-form', 'My Form'));

    store.addField('short_text'); // A
    store.addField('short_text'); // B
    store.addField('short_text'); // C
    const [a, b, c] = useBuilderStore.getState().fields;

    store.addLogicRule(a.fieldId, {
      condition: { fieldId: a.fieldId, operator: 'equals', value: 'x' },
      action: 'show',
      targetFieldId: b.fieldId,
    });

    // Same-field edit: replace in place, still one rule on A
    store.updateLogicRule(a.fieldId, 0, a.fieldId, {
      condition: { fieldId: a.fieldId, operator: 'equals', value: 'y' },
      action: 'hide',
      targetFieldId: c.fieldId,
    });
    let fields = useBuilderStore.getState().fields;
    let updatedA = fields.find((f) => f.fieldId === a.fieldId)!;
    expect(updatedA.logicRules).toHaveLength(1);
    expect(updatedA.logicRules![0]).toEqual({
      condition: { fieldId: a.fieldId, operator: 'equals', value: 'y' },
      action: 'hide',
      targetFieldId: c.fieldId,
    });

    // Moved-field edit: source field changes from A to B — rule relocates
    store.updateLogicRule(a.fieldId, 0, b.fieldId, {
      condition: { fieldId: b.fieldId, operator: 'equals', value: 'z' },
      action: 'show',
      targetFieldId: c.fieldId,
    });
    fields = useBuilderStore.getState().fields;
    updatedA = fields.find((f) => f.fieldId === a.fieldId)!;
    const updatedB = fields.find((f) => f.fieldId === b.fieldId)!;
    expect(updatedA.logicRules ?? []).toEqual([]);
    expect(updatedB.logicRules).toHaveLength(1);
    expect(updatedB.logicRules![0].condition.fieldId).toBe(b.fieldId);

    // Guard: target field can never equal the source field — no-op
    store.updateLogicRule(b.fieldId, 0, b.fieldId, {
      condition: { fieldId: b.fieldId, operator: 'equals', value: 'z' },
      action: 'show',
      targetFieldId: b.fieldId,
    });
    const unchangedB = useBuilderStore.getState().fields.find((f) => f.fieldId === b.fieldId)!;
    expect(unchangedB.logicRules).toHaveLength(1);
    expect(unchangedB.logicRules![0].targetFieldId).toBe(c.fieldId);
  });
});
