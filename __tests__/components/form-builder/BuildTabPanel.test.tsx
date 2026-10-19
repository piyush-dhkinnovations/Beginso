import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BuildTabPanel } from '@/components/form-builder/BuildTabPanel';
import { useBuilderStore } from '@/store/builderStore';
import type { BuilderDnd } from '@/components/form-builder/useBuilderDnd';
import type { Form } from '@/types/form';

const dnd = {
  sensors: [],
  collisionDetection: undefined,
  handleDragStart: vi.fn(),
  handleDragOver: vi.fn(),
  handleDragEnd: vi.fn(),
  activeDragConfig: null,
  activeDragField: null,
  activeDragFieldConfig: null,
  dragOverInfo: null,
  isToolboxOver: false,
  dropAnimation: null,
} as unknown as BuilderDnd;

function seed(over: Partial<Form> = {}) {
  useBuilderStore.getState().initForm({
    _id: 'f1',
    workspaceId: null,
    title: 'Survey',
    status: 'draft',
    fields: [],
    pages: [{ id: 'p1', order: 0, title: 'First page' }],
    branding: {},
    settings: { honeypotEnabled: true },
    schemaVersion: 1,
    responseCount: 0,
    createdAt: '',
    updatedAt: '',
    ...over,
  });
}

const renderPanel = (props: Partial<React.ComponentProps<typeof BuildTabPanel>> = {}) =>
  render(<BuildTabPanel dnd={dnd} isReordering={false} onAddField={vi.fn()} onToggleReorder={vi.fn()} {...props} />);

describe('BuildTabPanel', () => {
  beforeEach(() => {
    useBuilderStore.setState(useBuilderStore.getInitialState(), true);
    seed();
  });

  it('starts with the empty-canvas prompt, the toolbox and the page tile', () => {
    renderPanel();
    expect(screen.getByText('Start building your form')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search fields' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pages' })).toBeInTheDocument();
    expect(screen.getByLabelText('Page title (shown to respondents)')).toHaveValue('First page');
  });

  it('clicking a toolbox tile adds that field to the store and canvas', () => {
    renderPanel();
    const text = screen.getByRole('region', { name: 'Text & contact' });
    fireEvent.click(within(text).getByTitle('Email'));
    const { fields } = useBuilderStore.getState();
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe('email');
    expect(screen.getByRole('button', { name: new RegExp(`Select ${fields[0].label} field`) })).toBeInTheDocument();
    expect(useBuilderStore.getState().dirty).toBe(true);
  });

  it('selecting a card sets the active field in the store and expands it', async () => {
    useBuilderStore.getState().addField('short_text');
    useBuilderStore.getState().setActiveFieldId(null); // addField opens the new field; start closed
    renderPanel();
    const card = screen.getByRole('button', { name: /Select .* field/ });
    await userEvent.click(card);
    const id = useBuilderStore.getState().fields[0].fieldId;
    expect(useBuilderStore.getState().activeFieldId).toBe(id);
    expect(screen.getByPlaceholderText('Field label')).toBeInTheDocument();
    await userEvent.click(card); // a second click on the open card closes it
    expect(useBuilderStore.getState().activeFieldId).toBeNull();
    expect(screen.queryByPlaceholderText('Field label')).not.toBeInTheDocument();
  });

  it('clicking the canvas background clears the selection', async () => {
    useBuilderStore.getState().addField('short_text');
    const id = useBuilderStore.getState().fields[0].fieldId;
    useBuilderStore.getState().setActiveFieldId(id);
    renderPanel();
    await userEvent.click(screen.getByRole('main'));
    expect(useBuilderStore.getState().activeFieldId).toBeNull();
  });

  it('Delete soft-deletes (never removes) the field; Duplicate adds a copy', async () => {
    useBuilderStore.getState().addField('short_text');
    renderPanel();
    await userEvent.click(screen.getByTitle('Duplicate Field'));
    expect(useBuilderStore.getState().fields).toHaveLength(2);
    expect(useBuilderStore.getState().fields[1].label).toMatch(/\(Copy\)/);
    await userEvent.click(screen.getAllByTitle('Delete Field')[0]);
    const fields = useBuilderStore.getState().fields;
    expect(fields).toHaveLength(2);
    expect(fields.filter((f) => f.deleted)).toHaveLength(1);
  });

  it('editing the page title writes to the active page in the store', async () => {
    renderPanel();
    const input = screen.getByLabelText('Page title (shown to respondents)');
    await userEvent.clear(input);
    await userEvent.type(input, 'Renamed');
    await userEvent.tab();
    expect(useBuilderStore.getState().pages[0].title).toBe('Renamed');
  });

  it('Add page appends a page, and switching pages shows that page\'s own fields only', async () => {
    useBuilderStore.getState().addField('short_text');
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Add page' }));
    expect(useBuilderStore.getState().pages).toHaveLength(2);
    const [p1, p2] = useBuilderStore.getState().pages;
    useBuilderStore.getState().setActivePageId(p2.id);
    expect(await screen.findByText('Start building your form')).toBeInTheDocument();
    await userEvent.click(screen.getByTitle(/First page — 1 field/));
    expect(useBuilderStore.getState().activePageId).toBe(p1.id);
    expect(screen.getByRole('button', { name: /Select .* field/ })).toBeInTheDocument();
  });

  it('page tile badges count only non-deleted fields', () => {
    useBuilderStore.getState().addField('short_text');
    useBuilderStore.getState().addField('email');
    const first = useBuilderStore.getState().fields[0];
    useBuilderStore.getState().softDeleteField(first.fieldId);
    renderPanel();
    expect(screen.getByTitle('First page — 1 field')).toBeInTheDocument();
  });

  it('the mobile bar can reorder only when the active page has 2+ fields', () => {
    useBuilderStore.getState().addField('short_text');
    const { unmount } = renderPanel();
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeDisabled();
    unmount();
    useBuilderStore.getState().addField('email');
    renderPanel();
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeEnabled();
  });

  it('the mobile bar callbacks come from the parent', async () => {
    useBuilderStore.getState().addField('short_text');
    useBuilderStore.getState().addField('email');
    const onAddField = vi.fn();
    const onToggleReorder = vi.fn();
    renderPanel({ onAddField, onToggleReorder });
    await userEvent.click(screen.getByRole('button', { name: /Add field/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    expect(onAddField).toHaveBeenCalled();
    expect(onToggleReorder).toHaveBeenCalled();
  });

  it('reorder mode moves a field through the store', async () => {
    useBuilderStore.getState().addField('short_text');
    useBuilderStore.getState().addField('email');
    const [a, b] = useBuilderStore.getState().fields;
    renderPanel({ isReordering: true });
    await userEvent.click(screen.getByRole('button', { name: `Move ${a.label} down` }));
    const ordered = [...useBuilderStore.getState().fields].sort((x, y) => x.order - y.order).map((f) => f.fieldId);
    expect(ordered).toEqual([b.fieldId, a.fieldId]);
  });
});
