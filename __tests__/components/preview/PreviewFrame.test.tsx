import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { PreviewFrame } from '@/components/preview/PreviewFrame';

describe('PreviewFrame', () => {
  it('embeds the form preview in a titled iframe', () => {
    render(<PreviewFrame formId="abc" device="desktop" title="Form preview" />);
    const frame = screen.getByTitle('Form preview');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', '/forms/abc/preview?embed=1&bg=0');
  });

  it('adds a layout override to the query string', () => {
    render(<PreviewFrame formId="abc" device="desktop" layout="split" title="p" />);
    expect(screen.getByTitle('p')).toHaveAttribute('src', '/forms/abc/preview?embed=1&bg=0&layout=split');
  });

  const screenOf = () => screen.getByTitle('p').parentElement as HTMLElement;

  it.each([
    ['tablet', '768px'],
    ['mobile', '375px'],
  ] as const)('draws a %s at its real width, with a frame that sets it apart from the desktop', (device, width) => {
    render(<PreviewFrame formId="abc" device={device} title="p" />);
    expect(screenOf().style.width).toBe(width);
    expect(parseInt(screenOf().style.borderWidth, 10)).toBeGreaterThan(0);
    expect(screenOf().style.boxShadow).toContain('100vmax');
  });

  it('draws the desktop as the whole screen, with no frame', () => {
    render(<PreviewFrame formId="abc" device="desktop" title="p" />);
    expect(screenOf().style.width).toBe('100%');
    expect(screenOf().style.height).toBe('100%');
    expect(screenOf().style.borderWidth).toBe('0px');
  });

  it('keeps the same frame element while switching, so the change can move and typed answers stay', () => {
    const { rerender } = render(<PreviewFrame formId="abc" device="desktop" title="p" />);
    const frame = screen.getByTitle('p');
    rerender(<PreviewFrame formId="abc" device="mobile" title="p" />);
    expect(screen.getByTitle('p')).toBe(frame);
    expect(screenOf()).toHaveClass('transition-all', 'duration-700');
  });

  it('holds one placeholder until its own frame says the form is drawn', () => {
    render(<PreviewFrame formId="abc" device="desktop" title="p" />);
    const frame = screen.getByTitle('p') as HTMLIFrameElement;
    expect(screen.getByRole('status', { name: 'Loading the preview' })).toBeInTheDocument();
    expect(frame).toHaveClass('opacity-0');
    const drawn = (source: Window | null) =>
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data: { type: 'beginso-preview-drawn' }, origin: window.location.origin, source }));
      });
    drawn(window); // some other window's message is not this frame's
    expect(frame).toHaveClass('opacity-0');
    drawn(frame.contentWindow);
    expect(screen.queryByRole('status', { name: 'Loading the preview' })).not.toBeInTheDocument();
    expect(frame).toHaveClass('opacity-100');
  });

  it('shows the frame anyway if the form never says so', () => {
    vi.useFakeTimers();
    render(<PreviewFrame formId="abc" device="desktop" title="p" />);
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByTitle('p')).toHaveClass('opacity-100');
    vi.useRealTimers();
  });
});
