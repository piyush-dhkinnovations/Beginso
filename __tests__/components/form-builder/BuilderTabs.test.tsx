import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BuilderTabs } from '@/components/form-builder/BuilderTabs';

const base = { activeTab: 'build' as const, onChange: vi.fn(), canUndo: true, canRedo: true, onUndo: vi.fn(), onRedo: vi.fn() };
const tabNames = () => screen.getAllByRole('tab').map((t) => t.textContent);

describe('BuilderTabs', () => {
  it('renders Build, Branding, Share and Settings as tabs, with the active one selected', () => {
    render(<BuilderTabs {...base} activeTab="branding" />);
    expect(tabNames()).toEqual(['Build', 'Branding', 'Share', 'Settings']);
    expect(screen.getByRole('tab', { name: 'Branding' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Build' })).toHaveAttribute('aria-selected', 'false');
  });

  it('hides Share when not allowed and Settings when asked', () => {
    render(<BuilderTabs {...base} showShare={false} hideSettings />);
    expect(tabNames()).toEqual(['Build', 'Branding']);
  });

  it('shows the field count on Build only when above zero', () => {
    const { rerender } = render(<BuilderTabs {...base} fieldCount={0} />);
    expect(screen.getByRole('tab', { name: 'Build' })).toHaveTextContent(/^Build$/);
    rerender(<BuilderTabs {...base} fieldCount={5} />);
    expect(screen.getByRole('tab', { name: /^Build\s*5$/ })).toBeInTheDocument();
  });

  it('clicking a tab reports its id', async () => {
    const onChange = vi.fn();
    render(<BuilderTabs {...base} onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Share' }));
    expect(onChange).toHaveBeenCalledWith('share');
  });

  it('undo and redo fire, and are disabled per their flags', async () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const { rerender } = render(<BuilderTabs {...base} onUndo={onUndo} onRedo={onRedo} />);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);

    rerender(<BuilderTabs {...base} canUndo={false} canRedo={false} onUndo={onUndo} onRedo={onRedo} />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });
});
