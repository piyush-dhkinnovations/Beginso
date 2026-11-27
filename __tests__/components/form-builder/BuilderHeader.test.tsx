import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BuilderHeader, type BuilderHeaderProps } from '@/components/form-builder/BuilderHeader';
import { BUILDER_HEADER_SLOT_ID, BUILDER_SAVE_SLOT_ID } from '@/lib/formHeaderSlot';

function props(over: Partial<BuilderHeaderProps> = {}): BuilderHeaderProps {
  return {
    formTitle: 'Survey',
    dirty: false,
    isSaving: false,
    saveFailed: false,
    savedAt: null,
    onRetrySave: vi.fn(),
    canPublish: true,
    status: 'draft',
    onTitleChange: vi.fn(),
    onPreview: vi.fn(),
    onPublish: vi.fn(),
    onBack: vi.fn(),
    ...over,
  };
}

describe('BuilderHeader', () => {
  it('shows the editable title, the status and the save state', () => {
    render(<BuilderHeader {...props({ dirty: true })} />);
    expect(screen.getByRole('textbox', { name: 'Form name' })).toHaveValue('Survey');
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getAllByText('Unsaved changes').length).toBeGreaterThan(0);
  });

  it('commits a changed title on blur', async () => {
    const p = props();
    render(<BuilderHeader {...p} />);
    const input = screen.getByRole('textbox', { name: 'Form name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'New name');
    await userEvent.tab();
    expect(p.onTitleChange).toHaveBeenCalledWith('New name');
  });

  it('Enter commits the title too', async () => {
    const p = props();
    render(<BuilderHeader {...p} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Form name' }), '!{Enter}');
    expect(p.onTitleChange).toHaveBeenCalledWith('Survey!');
  });

  it('an emptied title is reverted, not committed', async () => {
    const p = props();
    render(<BuilderHeader {...p} />);
    const input = screen.getByRole('textbox', { name: 'Form name' });
    await userEvent.clear(input);
    await userEvent.tab();
    expect(p.onTitleChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('Survey');
  });

  it('an unchanged title is not re-committed', async () => {
    const p = props();
    render(<BuilderHeader {...p} />);
    await userEvent.click(screen.getByRole('textbox', { name: 'Form name' }));
    await userEvent.tab();
    expect(p.onTitleChange).not.toHaveBeenCalled();
  });

  it('follows an external title change (e.g. undo)', () => {
    const { rerender } = render(<BuilderHeader {...props()} />);
    rerender(<BuilderHeader {...props({ formTitle: 'Renamed' })} />);
    expect(screen.getByRole('textbox', { name: 'Form name' })).toHaveValue('Renamed');
  });

  it('a draft shows Publish; a closed form shows Re-publish', async () => {
    const p = props();
    const { rerender } = render(<BuilderHeader {...p} />);
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(p.onPublish).toHaveBeenCalledTimes(1);
    rerender(<BuilderHeader {...props({ status: 'closed' })} />);
    expect(screen.getByRole('button', { name: 'Re-publish' })).toBeInTheDocument();
  });

  it('a published form shows a Published button that opens publish management', async () => {
    const p = props({ status: 'published' });
    render(<BuilderHeader {...p} />);
    await userEvent.click(screen.getByRole('button', { name: 'Published' }));
    expect(p.onPublish).toHaveBeenCalled();
  });

  it('without publish rights there is no publish button of any kind', () => {
    const { rerender } = render(<BuilderHeader {...props({ canPublish: false })} />);
    expect(screen.queryByRole('button', { name: /Publish|Published/ })).not.toBeInTheDocument();
    rerender(<BuilderHeader {...props({ canPublish: false, status: 'published' })} />);
    expect(screen.queryByRole('button', { name: /Publish/ })).not.toBeInTheDocument();
  });

  it('Preview and Back fire their callbacks', async () => {
    const p = props();
    render(<BuilderHeader {...p} />);
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to Forms' }));
    expect(p.onPreview).toHaveBeenCalled();
    expect(p.onBack).toHaveBeenCalled();
  });

  it('has no three-dot menu: settings is a tab, and closing or deleting live on the Forms list', () => {
    render(<BuilderHeader {...props({ status: 'published' })} />);
    expect(screen.queryByRole('button', { name: 'More form actions' })).not.toBeInTheDocument();
  });

  it('a failed save offers Retry', async () => {
    const p = props({ saveFailed: true });
    render(<BuilderHeader {...p} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(p.onRetrySave).toHaveBeenCalled();
  });
});

describe('BuilderHeader in the top bar', () => {
  const desktop = (matches: boolean) =>
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({ matches, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList);

  it('from 1024px the name and actions move to the top bar and the save state to the tabs strip, once each', async () => {
    const media = desktop(true);
    const p = props({ savedAt: new Date() });
    const slot = document.body.appendChild(document.createElement('div'));
    slot.id = BUILDER_HEADER_SLOT_ID;
    const saveSlot = document.body.appendChild(document.createElement('div'));
    saveSlot.id = BUILDER_SAVE_SLOT_ID;
    const { container } = render(<BuilderHeader {...p} icon={<span>logo</span>} />);
    expect(within(saveSlot).getByRole('status')).toHaveTextContent('All changes saved');
    expect(within(saveSlot).queryByText(/·/)).not.toBeInTheDocument();
    expect(slot).not.toHaveTextContent('All changes saved');
    expect(screen.queryByText('logo')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
    expect(within(slot).getByRole('textbox', { name: 'Form name' })).toHaveValue('Survey');
    expect(within(slot).getByRole('button', { name: 'Preview' })).toBeInTheDocument();
    expect(within(slot).getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    await userEvent.click(within(slot).getByRole('button', { name: 'Back to Forms' }));
    expect(p.onBack).toHaveBeenCalled();
    slot.remove();
    saveSlot.remove();
    media.mockRestore();
  });

  it('below 1024px it stays in the page even when the slot exists', () => {
    const media = desktop(false);
    const slot = document.body.appendChild(document.createElement('div'));
    slot.id = BUILDER_HEADER_SLOT_ID;
    const { container } = render(<BuilderHeader {...props()} />);
    expect(within(container).getByRole('textbox', { name: 'Form name' })).toBeInTheDocument();
    expect(slot).toBeEmptyDOMElement();
    slot.remove();
    media.mockRestore();
  });
});
