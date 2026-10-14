/**
 * __tests__/components/ui/ContextSwitcher.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextSwitcher } from '@/components/ui/ContextSwitcher';

describe('ContextSwitcher component', () => {
  it('renders a static trigger and does not throw when given no workspace list', () => {
    expect(() => render(<ContextSwitcher />)).not.toThrow();
    expect(screen.getByRole('button', { name: /Personal/ })).toBeInTheDocument();
  });

  it('shows the current label and its meta line (role and member count) instead of a bare count badge', () => {
    render(<ContextSwitcher currentLabel="Acme Inc" currentMeta="Owner · 3 members" workspaces={[{ id: '1', name: 'Acme Inc', slug: 'acme' }]} />);
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByText('Owner · 3 members')).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});

// sprint-8-workspaces-context, requirements.md §7.2 — the real dropdown Sprint 7 deferred.
describe('ContextSwitcher — real dropdown (sprint-8, Day 2)', () => {
  const workspaces = [
    { id: 'w1', name: 'Acme Inc', slug: 'acme', role: 'owner' },
    { id: 'w2', name: 'Beta Co', slug: 'beta', role: 'member' },
  ];

  it('opens a real dropdown listing Personal plus every workspace with its role', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ContextSwitcher currentLabel="Personal" workspaces={workspaces} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Switch context/ }));

    expect(screen.getByRole('menuitem', { name: /Personal/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Acme Inc/ })).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Beta Co/ })).toBeInTheDocument();
  });

  it('calls onSelect with the personal target', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ContextSwitcher workspaces={workspaces} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Switch context/ }));
    await user.click(screen.getByRole('menuitem', { name: /Personal/ }));

    expect(onSelect).toHaveBeenCalledWith({ type: 'personal' });
  });

  it('calls onSelect with the chosen workspace target', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ContextSwitcher workspaces={workspaces} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Switch context/ }));
    await user.click(screen.getByRole('menuitem', { name: /Beta Co/ }));

    expect(onSelect).toHaveBeenCalledWith({ type: 'workspace', workspace: workspaces[1] });
  });

  it('is keyboard operable: ArrowDown opens and moves focus, Enter selects', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ContextSwitcher workspaces={workspaces} onSelect={onSelect} />);

    const trigger = screen.getByRole('button', { name: /Switch context/ });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /Personal/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith({ type: 'workspace', workspace: workspaces[0] });
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<ContextSwitcher workspaces={workspaces} onSelect={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /Switch context/ });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on selection (closes on navigate)', async () => {
    const user = userEvent.setup();
    render(<ContextSwitcher workspaces={workspaces} onSelect={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Switch context/ }));
    await user.click(screen.getByRole('menuitem', { name: /Acme Inc/ }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('ContextSwitcher — workspace logo', () => {
  it('shows the BeginSo mark for a workspace without a logo, and its own logo when it has one', () => {
    const { container, rerender } = render(<ContextSwitcher currentLabel="Acme" currentMeta="Owner · 1 member" />);
    expect(container.querySelector('img[src="/favicon.svg"]')).toBeInTheDocument();
    rerender(<ContextSwitcher currentLabel="Acme" currentLogo="https://cdn/x.png" />);
    expect(container.querySelector('img[src="/favicon.svg"]')).not.toBeInTheDocument();
    expect(container.querySelector('img[src="https://cdn/x.png"]')).toBeInTheDocument();
  });
});
