import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResponsesCustomizeDrawer } from '@/components/responses/ResponsesCustomizeDrawer';
import { DEFAULT_RESPONSE_SETUP, type ResponseSetup } from '@/types/responseSetup';
import type { FormField } from '@/types/form';

const mockGet = vi.fn();
const mockSave = vi.fn();
vi.mock('@/services/responseSetup', () => ({
  responseSetupService: { get: (...a: unknown[]) => mockGet(...a), save: (...a: unknown[]) => mockSave(...a) },
}));
vi.mock('@/services/stages', () => ({
  stagesService: {
    list: vi.fn().mockResolvedValue([
      { id: 'w1', name: 'New', colour: 'neutral', category: 'new', order: 0, isDefault: true },
      { id: 'w2', name: 'In Progress', colour: 'warning', category: 'in_progress', order: 1, isDefault: false },
      { id: 'w3', name: 'Completed', colour: 'success', category: 'completed', order: 2, isDefault: false },
    ]),
  },
}));
vi.mock('@/services/responses', () => ({
  responsesService: { getResponses: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 4, totalPages: 1 }) },
}));
const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useFormFields', () => ({ useFormFields: () => FIELDS }));

const field = (fieldId: string, label: string) => ({ fieldId, label, type: 'short_text', pageId: 'p', required: false, deleted: false, order: 0 }) as FormField;
const FIELDS = [field('n', 'Full name'), field('film', 'Title of the film')];

const SAVED: ResponseSetup = { version: 2, setup: DEFAULT_RESPONSE_SETUP, stages: { mode: 'workspace', list: [], startIndex: null } };

function renderDrawer(props: Partial<React.ComponentProps<typeof ResponsesCustomizeDrawer>> = {}) {
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ResponsesCustomizeDrawer isOpen onClose={onClose} formId="f1" scope="acme" fields={FIELDS} responseCount={12} {...props} />
    </QueryClientProvider>
  );
  return { onClose, client };
}
const saveButton = () => screen.getByRole('button', { name: 'Save changes' });

describe('ResponsesCustomizeDrawer', () => {
  beforeEach(() => {
    mockGet.mockReset().mockResolvedValue(SAVED);
    mockSave.mockReset().mockResolvedValue({ ...SAVED, version: 3 });
    toast.mockReset();
  });

  it('renders nothing while closed', () => {
    renderDrawer({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the stages tab with nothing to save yet', async () => {
    renderDrawer();
    expect(await screen.findByRole('radio', { name: /Use the workspace stages/ })).toBeChecked();
    expect(screen.getByRole('tab', { name: 'Stages' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No changes');
    expect(saveButton()).toBeDisabled();
  });

  it('a change says "Not saved yet", and Save sends the whole setup with the version it loaded', async () => {
    renderDrawer();
    await screen.findByRole('radio', { name: /Use the workspace stages/ });
    await userEvent.click(screen.getByRole('tab', { name: 'Defaults' }));
    await userEvent.selectOptions(screen.getByLabelText('Opens as'), 'board');
    expect(screen.getByRole('status')).toHaveTextContent('Not saved yet');
    await userEvent.click(saveButton());

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave).toHaveBeenCalledWith('f1', expect.objectContaining({ version: 2, opensAs: 'board', sort: 'newest', tableColumns: DEFAULT_RESPONSE_SETUP.tableColumns, stages: { mode: 'workspace' } }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Saved. This form now uses your setup.', 'success'));
  });

  it('closes after saving', async () => {
    const { onClose } = renderDrawer();
    await screen.findByRole('radio', { name: /Use the workspace stages/ });
    await userEvent.click(screen.getByRole('tab', { name: 'Table columns' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Notes' }));
    await userEvent.click(saveButton());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockSave.mock.calls[0][1].tableColumns).toEqual([...DEFAULT_RESPONSE_SETUP.tableColumns, 'notes']);
  });

  it('changing the stages of a form with responses asks first, then saves', async () => {
    renderDrawer();
    await userEvent.click(await screen.findByRole('radio', { name: /This form has its own stages/ }));
    await userEvent.click(saveButton());
    expect(await screen.findByText('Move the responses to the new stages?')).toBeInTheDocument();
    expect(screen.getByText(/This form has 12 responses/)).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Save and move them' }));
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave.mock.calls[0][1].stages).toMatchObject({ mode: 'own', startIndex: 0 });
    expect(mockSave.mock.calls[0][1].stages.stages.map((s: { name: string }) => s.name)).toEqual(['New', 'In Progress', 'Completed']);
  });

  it('a form with no responses saves a change of stages straight away', async () => {
    renderDrawer({ responseCount: 0 });
    await userEvent.click(await screen.findByRole('radio', { name: /This form has its own stages/ }));
    await userEvent.click(saveButton());
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Move the responses to the new stages?')).not.toBeInTheDocument();
  });

  it('cannot be saved while a stage has no name, and says why', async () => {
    renderDrawer({ responseCount: 0 });
    await userEvent.click(await screen.findByRole('radio', { name: /This form has its own stages/ }));
    await userEvent.clear(screen.getByLabelText('Name of stage 1'));
    expect(saveButton()).toBeDisabled();
    expect(screen.getAllByText('Every stage needs a name.').length).toBeGreaterThan(0);
  });

  it('closing with unsaved changes asks whether to discard them', async () => {
    const { onClose } = renderDrawer();
    await userEvent.click(await screen.findByRole('tab', { name: 'Defaults' }));
    await userEvent.selectOptions(screen.getByLabelText('Row height'), 'compact');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Discard your changes?')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Discard changes' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('closing without changes just closes', async () => {
    const { onClose } = renderDrawer();
    await screen.findByRole('radio', { name: /Use the workspace stages/ });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Reset to defaults puts the panel back to today\'s setup', async () => {
    mockGet.mockResolvedValue({ ...SAVED, setup: { ...DEFAULT_RESPONSE_SETUP, opensAs: 'board', rowHeight: 'compact' } });
    renderDrawer();
    await userEvent.click(await screen.findByRole('tab', { name: 'Defaults' }));
    expect(screen.getByLabelText('Opens as')).toHaveValue('board');
    await userEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(screen.getByLabelText('Opens as')).toHaveValue('table');
    expect(screen.getByLabelText('Row height')).toHaveValue('comfortable');
    expect(screen.getByRole('status')).toHaveTextContent('Not saved yet');
  });

  it('a save that someone else got in first says so and offers their version', async () => {
    mockSave.mockRejectedValue({ response: { status: 409, data: { message: 'stale' } } });
    renderDrawer();
    await userEvent.click(await screen.findByRole('tab', { name: 'Defaults' }));
    await userEvent.selectOptions(screen.getByLabelText('Opens as'), 'calendar');
    await userEvent.click(saveButton());
    expect(await screen.findByText('Someone else changed this setup first')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    mockGet.mockResolvedValue({ ...SAVED, version: 5, setup: { ...DEFAULT_RESPONSE_SETUP, opensAs: 'board' } });
    await userEvent.click(screen.getByRole('button', { name: 'Load the latest' }));
    await waitFor(() => expect(screen.queryByText('Someone else changed this setup first')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Opens as')).toHaveValue('board');
    expect(screen.getByRole('status')).toHaveTextContent('No changes');
  });

  it('any other failure shows the server\'s message and keeps the changes', async () => {
    mockSave.mockRejectedValue({ response: { status: 422, data: { message: 'A column or field refers to a question that is not on this form' } } });
    renderDrawer();
    await userEvent.click(await screen.findByRole('tab', { name: 'Defaults' }));
    await userEvent.selectOptions(screen.getByLabelText('Opens as'), 'board');
    await userEvent.click(saveButton());
    expect(await screen.findByText('A column or field refers to a question that is not on this form')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Not saved yet');
  });

  it('a personal form is told it keeps the three standard stages', async () => {
    renderDrawer({ scope: 'personal' });
    expect(await screen.findByText('Personal forms use the three standard stages')).toBeInTheDocument();
  });
});
