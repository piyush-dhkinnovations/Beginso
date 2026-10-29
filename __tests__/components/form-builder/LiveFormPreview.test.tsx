import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LiveFormPreview } from '@/components/form-builder/LiveFormPreview';

const postMessage = vi.fn();
const originalRO = globalThis.ResizeObserver;

beforeEach(() => {
  postMessage.mockReset();
  vi.spyOn(window.HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue({ postMessage } as unknown as Window);
});
afterEach(() => {
  vi.restoreAllMocks();
  globalThis.ResizeObserver = originalRO;
});

const liveCalls = () => postMessage.mock.calls.filter(([m]) => m?.type === 'beginso-live-branding');

describe('LiveFormPreview', () => {
  it('embeds the real preview document for the form', () => {
    render(<LiveFormPreview formId="abc" branding={{}} />);
    expect(screen.getByTitle('Live form preview')).toHaveAttribute('src', '/forms/abc/preview?embed=1');
  });

  it('posts the branding and layout to the frame, targeting only this origin', () => {
    render(<LiveFormPreview formId="abc" branding={{ primaryColor: '#123456' }} layout="steps" />);
    expect(postMessage).toHaveBeenCalledWith({ type: 'beginso-live-branding', branding: { primaryColor: '#123456' }, layout: 'steps' }, window.location.origin);
  });

  it('re-posts whenever branding or layout change', () => {
    const { rerender } = render(<LiveFormPreview formId="abc" branding={{ primaryColor: '#111111' }} layout="classic" />);
    const before = liveCalls().length;
    rerender(<LiveFormPreview formId="abc" branding={{ primaryColor: '#222222' }} layout="classic" />);
    expect(liveCalls().length).toBeGreaterThan(before);
    expect(liveCalls().at(-1)?.[0]).toMatchObject({ branding: { primaryColor: '#222222' } });
  });

  it('re-posts when the frame announces beginso-preview-ready from the same origin', () => {
    render(<LiveFormPreview formId="abc" branding={{ primaryColor: '#111111' }} />);
    const before = liveCalls().length;
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'beginso-preview-ready' }, origin: window.location.origin }));
    });
    expect(liveCalls().length).toBe(before + 1);
  });

  it('ignores ready messages from another origin and unrelated message types', () => {
    render(<LiveFormPreview formId="abc" branding={{}} />);
    const before = liveCalls().length;
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'beginso-preview-ready' }, origin: 'https://evil.example' }));
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'something-else' }, origin: window.location.origin }));
      window.dispatchEvent(new MessageEvent('message', { data: null, origin: window.location.origin }));
    });
    expect(liveCalls().length).toBe(before);
  });

  it('stops listening after unmount', () => {
    const { unmount } = render(<LiveFormPreview formId="abc" branding={{}} />);
    unmount();
    const before = liveCalls().length;
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'beginso-preview-ready' }, origin: window.location.origin }));
    });
    expect(liveCalls().length).toBe(before);
  });

  it('posts again when the iframe finishes loading', () => {
    render(<LiveFormPreview formId="abc" branding={{}} />);
    const before = liveCalls().length;
    act(() => {
      screen.getByTitle('Live form preview').dispatchEvent(new Event('load'));
    });
    expect(liveCalls().length).toBe(before + 1);
  });

  it('renders at a fixed 1100px desktop width, unscaled until the column width is known', () => {
    render(<LiveFormPreview formId="abc" branding={{}} />);
    const frame = screen.getByTitle('Live form preview');
    expect(frame).toHaveStyle({ width: '1100px', height: '900px', transform: 'scale(1)' });
  });

  it('scales the frame down to fit a narrow column (never above 1)', () => {
    let cb: ResizeObserverCallback = () => {};
    class RO {
      constructor(c: ResizeObserverCallback) {
        cb = c;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', RO);
    const { container } = render(<LiveFormPreview formId="abc" branding={{}} />);
    act(() => cb([{ contentRect: { width: 550 } } as ResizeObserverEntry], {} as ResizeObserver));
    expect(screen.getByTitle('Live form preview')).toHaveStyle({ transform: 'scale(0.5)' });
    expect(container.firstElementChild).toHaveStyle({ height: '450px' });
    act(() => cb([{ contentRect: { width: 3000 } } as ResizeObserverEntry], {} as ResizeObserver));
    expect(screen.getByTitle('Live form preview')).toHaveStyle({ transform: 'scale(1)' });
  });
});

describe('LiveFormPreview: the stage and its zoom', () => {
  // A stage of the given size (the box the preview is drawn in).
  const stageOf = () => {
    let cb: ResizeObserverCallback = () => {};
    class RO {
      constructor(c: ResizeObserverCallback) {
        cb = c;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', RO);
    return (width: number, height: number) => act(() => cb([{ contentRect: { width, height } } as ResizeObserverEntry], {} as ResizeObserver));
  };
  const formIsDrawn = () =>
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'beginso-preview-drawn' }, origin: window.location.origin }));
    });
  const frame = () => screen.getByTitle('Live form preview');
  const stageBox = () => frame().closest('.relative') as HTMLElement;

  it('holds a placeholder of its own until the form says it is drawn, so nothing else is seen first', () => {
    render(<LiveFormPreview fill formId="abc" branding={{}} />);
    expect(screen.getByRole('status', { name: 'Loading the preview' })).toBeInTheDocument();
    expect(frame().className).toContain('opacity-0');
    formIsDrawn();
    expect(screen.queryByRole('status', { name: 'Loading the preview' })).not.toBeInTheDocument();
    expect(frame().className).toContain('opacity-100');
  });

  it('shows the frame anyway if the form never says it is drawn (it may have failed, and says so itself)', () => {
    vi.useFakeTimers();
    render(<LiveFormPreview fill formId="abc" branding={{}} />);
    act(() => {
      vi.advanceTimersByTime(8100);
    });
    expect(screen.queryByRole('status', { name: 'Loading the preview' })).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('is 100% to start: the form is drawn at full size and fills the stage', () => {
    const stage = stageOf();
    render(<LiveFormPreview fill formId="abc" branding={{}} />);
    stage(1000, 600);
    expect(frame()).toHaveStyle({ transform: 'scale(1)', width: '1000px', height: '600px' });
  });

  it('zooming out draws it smaller on a stage that is the same size: the frame is bigger by as much, so the page still fills the stage', () => {
    const stage = stageOf();
    const { rerender } = render(<LiveFormPreview fill zoom={0.5} formId="abc" branding={{}} />);
    stage(1000, 600);
    expect(frame()).toHaveStyle({ transform: 'scale(0.5)', width: '2000px', height: '1200px' });
    rerender(<LiveFormPreview fill zoom={1.5} formId="abc" branding={{}} />);
    expect(frame()).toHaveStyle({ transform: 'scale(1.5)', width: `${1000 / 1.5}px` });
  });

  it('on a laptop screen the form is the stage itself: one box, not a narrower frame in a grey one', () => {
    const stage = stageOf();
    render(<LiveFormPreview fill zoom={0.75} formId="abc" branding={{}} />);
    stage(1000, 600);
    expect(frame().parentElement).toBe(stageBox());
    expect(stageBox().className).not.toContain('overflow-auto');
  });

  it('a tablet or a phone keeps its real width, in a box of its own in the middle, and the stage scrolls sideways when it is zoomed past it', () => {
    const stage = stageOf();
    const { rerender } = render(<LiveFormPreview fill device="mobile" formId="abc" branding={{}} />);
    stage(1000, 600);
    expect(frame()).toHaveStyle({ width: '375px' });
    expect(frame().parentElement).not.toBe(stageBox());
    rerender(<LiveFormPreview fill device="tablet" zoom={1.5} formId="abc" branding={{}} />);
    expect(frame()).toHaveStyle({ width: '768px', transform: 'scale(1.5)' });
    expect(stageBox().className).toContain('overflow-auto');
  });
});
