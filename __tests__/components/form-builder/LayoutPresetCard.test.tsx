import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutPresetCard } from '@/components/form-builder/LayoutPresetCard';
import { LAYOUT_PRESETS } from '@/lib/layoutPresets';

function setup(id = 'classic', over: Partial<React.ComponentProps<typeof LayoutPresetCard>> = {}) {
  const preset = LAYOUT_PRESETS.find((p) => p.id === id)!;
  const onPreview = vi.fn();
  const onUse = vi.fn();
  render(<LayoutPresetCard preset={preset} selected={false} canPreview onPreview={onPreview} onUse={onUse} {...over} />);
  return { preset, onPreview, onUse };
}

describe('LayoutPresetCard', () => {
  it.each(LAYOUT_PRESETS.map((p) => p.id))('renders the %s preset: name, use-case, and a schematic', (id) => {
    const { preset } = setup(id);
    expect(screen.getByRole('heading', { name: preset.name })).toBeInTheDocument();
    expect(screen.getByText(preset.use)).toBeInTheDocument();
    expect(screen.getByRole('article').querySelector('.h-40')).not.toBeNull();
  });

  it('shows the "best for" badge normally and "Recommended" when recommended', () => {
    const { preset } = setup('classic');
    expect(screen.getByText(preset.best)).toBeInTheDocument();
    expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
  });

  it('a recommended, unselected card shows the Recommended badge instead', () => {
    const { preset } = setup('classic', { recommended: true });
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.queryByText(preset.best)).not.toBeInTheDocument();
  });

  it('a selected card is marked "In use", disabled, and not "Recommended"', () => {
    setup('classic', { selected: true, recommended: true });
    expect(screen.getByRole('button', { name: 'In use' })).toBeDisabled();
    expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
  });

  it('Use this layout and Preview fire their callbacks', async () => {
    const { onUse, onPreview } = setup('steps');
    await userEvent.click(screen.getByRole('button', { name: 'Use this layout' }));
    await userEvent.click(screen.getByRole('button', { name: /Preview/ }));
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledTimes(1);
  });

  it('Preview is disabled when there is no saved form to preview', () => {
    setup('steps', { canPreview: false });
    expect(screen.getByRole('button', { name: /Preview/ })).toBeDisabled();
  });

  it('describes the preset\'s look (typeface, card style, background)', () => {
    setup('compact');
    expect(screen.getByText(/flat card · plain background/)).toBeInTheDocument();
    expect(screen.getByRole('article').style.fontFamily).not.toBe('');
  });
});
