import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutGallery } from '@/components/form-builder/LayoutGallery';
import { LAYOUT_PRESETS } from '@/lib/layoutPresets';

function setup(over: Partial<React.ComponentProps<typeof LayoutGallery>> = {}) {
  const onUse = vi.fn();
  const onSkip = vi.fn();
  render(<LayoutGallery formId="f1" currentLayout={undefined} fieldCount={0} isPublic={false} onUse={onUse} onSkip={onSkip} {...over} />);
  return { onUse, onSkip };
}

const cardOf = (name: string) => screen.getByRole('heading', { name }).closest('article') as HTMLElement;

describe('LayoutGallery', () => {
  it('shows all six presets under a "Step 1 of 2" heading', () => {
    setup();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choose a layout' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(LAYOUT_PRESETS.length);
  });

  it('with no stored layout, Classic is in use', () => {
    setup();
    expect(within(cardOf('Classic')).getByRole('button', { name: 'In use' })).toBeDisabled();
  });

  it('legacy stored values map to a preset (two_column becomes Compact)', () => {
    setup({ currentLayout: 'two_column' });
    expect(within(cardOf('Compact')).getByRole('button', { name: 'In use' })).toBeInTheDocument();
    expect(within(cardOf('Classic')).getByRole('button', { name: 'Use this layout' })).toBeInTheDocument();
  });

  it('shows no nudge for an empty form, and a singular/plural one otherwise', () => {
    const { unmount } = render(<LayoutGallery fieldCount={0} isPublic={false} onUse={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.queryByText(/Your form has/)).not.toBeInTheDocument();
    unmount();
    const r2 = render(<LayoutGallery fieldCount={1} isPublic={false} onUse={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText('Your form has 1 field.')).toBeInTheDocument();
    r2.unmount();
    render(<LayoutGallery fieldCount={8} isPublic={false} onUse={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText('Your form has 8 fields.')).toBeInTheDocument();
  });

  it('recommends Classic for up to 5 fields and Steps for more', () => {
    const { unmount } = render(<LayoutGallery fieldCount={5} isPublic={false} onUse={vi.fn()} onSkip={vi.fn()} currentLayout="compact" />);
    expect(within(cardOf('Classic')).getByText('Recommended')).toBeInTheDocument();
    unmount();
    render(<LayoutGallery fieldCount={6} isPublic={false} onUse={vi.fn()} onSkip={vi.fn()} currentLayout="compact" />);
    expect(within(cardOf('Steps')).getByText('Recommended')).toBeInTheDocument();
    expect(within(cardOf('Classic')).queryByText('Recommended')).not.toBeInTheDocument();
  });

  it('"Use this layout" reports the preset id', async () => {
    const { onUse } = setup();
    await userEvent.click(within(cardOf('Guided')).getByRole('button', { name: 'Use this layout' }));
    expect(onUse).toHaveBeenCalledWith('guided');
  });

  it('Skip goes straight to the editor step', async () => {
    const { onSkip } = setup();
    await userEvent.click(screen.getByRole('button', { name: /Skip — customise manually/ }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('Preview is unavailable for an unsaved form (no formId)', () => {
    setup({ formId: undefined });
    screen.getAllByRole('button', { name: /Preview/ }).forEach((b) => expect(b).toBeDisabled());
  });

  describe('full-screen preview', () => {
    async function open(name: string, over: Partial<React.ComponentProps<typeof LayoutGallery>> = {}) {
      const h = setup(over);
      await userEvent.click(within(cardOf(name)).getByRole('button', { name: /Preview/ }));
      return h;
    }

    it('opens a modal dialog with the real form in an iframe forced to that layout', async () => {
      await open('Steps');
      const dialog = screen.getByRole('dialog', { name: 'Steps' });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(within(dialog).getByTitle('Steps layout preview')).toHaveAttribute('src', '/forms/f1/preview?embed=1&layout=steps');
    });

    it('"Back to layouts" and Close dismiss it without choosing', async () => {
      const { onUse } = await open('Steps');
      await userEvent.click(screen.getByRole('button', { name: 'Back to layouts' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await userEvent.click(within(cardOf('Steps')).getByRole('button', { name: /Preview/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Close preview' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onUse).not.toHaveBeenCalled();
    });

    it('Escape closes it', async () => {
      await open('Steps');
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('"Use {name}" picks the layout and closes the preview', async () => {
      const { onUse } = await open('Steps');
      await userEvent.click(screen.getByRole('button', { name: 'Use Steps' }));
      expect(onUse).toHaveBeenCalledWith('steps');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('"Use" is disabled for the layout already in use', async () => {
      await open('Classic');
      expect(screen.getByRole('button', { name: 'Use Classic' })).toBeDisabled();
    });

    it('warns that Compact is for internal forms only when the form is public', async () => {
      await open('Compact', { isPublic: true });
      expect(screen.getByText('Compact is for internal forms')).toBeInTheDocument();
    });

    it('no Compact warning for a non-public form, nor for other presets on a public form', async () => {
      await open('Compact', { isPublic: false });
      expect(screen.queryByText('Compact is for internal forms')).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Back to layouts' }));
      await userEvent.click(within(cardOf('Steps')).getByRole('button', { name: /Preview/ }));
      expect(screen.queryByText('Compact is for internal forms')).not.toBeInTheDocument();
    });
  });
});
