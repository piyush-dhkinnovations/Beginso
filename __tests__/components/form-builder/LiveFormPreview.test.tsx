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
