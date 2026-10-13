import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { EmbedPreview } from '@/components/form-builder/embed/EmbedPreview';
import { DEFAULT_EMBED_CONFIG, type EmbedConfig, type EmbedContext } from '@/lib/embed/buildEmbedSnippet';
import { EMBED_MSG } from '@/lib/embed/embedParams';

const ctx: EmbedContext = { origin: 'https://app.test', slug: 'abc', formTitle: 'Survey' };
const cfg = (over: Partial<EmbedConfig> = {}): EmbedConfig => ({ ...DEFAULT_EMBED_CONFIG, ...over });

const frame = () => screen.getByTitle('Live preview of Survey') as HTMLIFrameElement;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.querySelectorAll('script[data-beginso-preview]').forEach((s) => s.remove());
});

function message(source: unknown, data: unknown, origin = window.location.origin) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin, source: source as MessageEventSource }));
  });
}

describe('EmbedPreview: inline methods', () => {
  it('loads the real public form with the snippet query plus preview=1, same origin', () => {
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'fixed', cover: false })} onMeasured={vi.fn()} />);
    const src = frame().getAttribute('src')!;
    expect(src.startsWith('/f/abc?')).toBe(true);
    expect(src).toContain('embed=1');
    expect(src).toContain('cover=0');
    expect(src.endsWith('&preview=1')).toBe(true);
  });

  it('applies width, height, border and rounding of the fixed method', () => {
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'fixed', widthUnit: 'px', widthValue: 700, height: 450, border: true, rounded: false })} onMeasured={vi.fn()} />);
    expect(frame()).toHaveStyle({ width: '700px', height: '450px', borderRadius: '0px', maxWidth: '100%' });
    expect(frame().style.border).toContain('1px solid');
    expect(screen.getByText('Fixed frame: 700px wide, 450px tall.')).toBeInTheDocument();
  });

  it('no border by default and rounded corners are 8px', () => {
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'fixed', border: false, rounded: true })} onMeasured={vi.fn()} />);
    expect(frame().style.borderRadius).toBe('8px');
    expect(frame().style.border).toMatch(/^(0|0px)/);
  });

  it('clamps out-of-range numbers before using them', () => {
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'fixed', height: 99999, widthUnit: 'px', widthValue: 1 })} onMeasured={vi.fn()} />);
    expect(frame()).toHaveStyle({ height: '5000px', width: '200px' });
  });

  it('the query follows config changes after the 300ms debounce, and remounts the frame', () => {
    const { rerender } = render(<EmbedPreview ctx={ctx} config={cfg({ method: 'fixed', theme: 'light' })} onMeasured={vi.fn()} />);
    expect(frame().getAttribute('src')).toContain('theme=light');
    rerender(<EmbedPreview ctx={ctx} config={cfg({ method: 'fixed', theme: 'dark' })} onMeasured={vi.fn()} />);
    expect(frame().getAttribute('src')).toContain('theme=light');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(frame().getAttribute('src')).toContain('theme=dark');
  });

  it('auto-height starts at 600px and says the frame resizes', () => {
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'auto' })} onMeasured={vi.fn()} />);
    expect(frame()).toHaveStyle({ height: '600px' });
    expect(screen.getByText(/resizes to the form/)).toBeInTheDocument();
  });

  it('a height message from the frame is reported, and auto-height adopts it', () => {
    const onMeasured = vi.fn();
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'auto' })} onMeasured={onMeasured} />);
    message(frame().contentWindow, { type: EMBED_MSG.height, height: 840 });
    expect(onMeasured).toHaveBeenCalledWith(840);
    expect(frame()).toHaveStyle({ height: '840px' });
  });

  it('fixed method reports the measured height but keeps its configured frame height', () => {
    const onMeasured = vi.fn();
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'fixed', height: 500 })} onMeasured={onMeasured} />);
    message(frame().contentWindow, { type: EMBED_MSG.height, height: 900 });
    expect(onMeasured).toHaveBeenCalledWith(900);
    expect(frame()).toHaveStyle({ height: '500px' });
  });

  it('ignores messages from another origin, another window, the wrong type or a bad height', () => {
    const onMeasured = vi.fn();
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'auto' })} onMeasured={onMeasured} />);
    message(frame().contentWindow, { type: EMBED_MSG.height, height: 840 }, 'https://evil.example');
    message(window, { type: EMBED_MSG.height, height: 840 });
    message(frame().contentWindow, { type: 'other', height: 840 });
    message(frame().contentWindow, { type: EMBED_MSG.height, height: 'tall' });
    message(frame().contentWindow, null);
    expect(onMeasured).not.toHaveBeenCalled();
  });

  it('auto-height greets the form after load, retrying six times at 500ms', () => {
    const postMessage = vi.fn();
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'auto' })} onMeasured={vi.fn()} />);
    vi.spyOn(frame(), 'contentWindow', 'get').mockReturnValue({ postMessage } as unknown as Window);
    fireEvent.load(frame());
    act(() => {
      vi.advanceTimersByTime(500 * 10);
    });
    expect(postMessage).toHaveBeenCalledTimes(6);
    expect(postMessage).toHaveBeenCalledWith({ type: EMBED_MSG.hello, scheme: 'light', autoHeight: true }, window.location.origin);
  });

  it('the fixed method never greets the form', () => {
    const postMessage = vi.fn();
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'fixed' })} onMeasured={vi.fn()} />);
    vi.spyOn(frame(), 'contentWindow', 'get').mockReturnValue({ postMessage } as unknown as Window);
    fireEvent.load(frame());
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('stops listening for height messages after unmount', () => {
    const onMeasured = vi.fn();
    const { unmount } = render(<EmbedPreview ctx={ctx} config={cfg({ method: 'auto' })} onMeasured={onMeasured} />);
    const win = frame().contentWindow;
    unmount();
    message(win, { type: EMBED_MSG.height, height: 840 });
    expect(onMeasured).not.toHaveBeenCalled();
  });

  it('falls back to a generic frame title for an untitled form', () => {
    render(<EmbedPreview ctx={{ ...ctx, formTitle: '' }} config={cfg({ method: 'fixed' })} onMeasured={vi.fn()} />);
    expect(screen.getByTitle('Live preview of the form')).toBeInTheDocument();
  });
});

describe('EmbedPreview: popup and drawer', () => {
  it('popup renders a trigger button with exactly the snippet attributes, plus preview=1', () => {
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'popup', buttonText: 'Book a demo', modalWidth: 700 })} onMeasured={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'Book a demo' });
    expect(btn).toHaveAttribute('data-beginso-popup', 'abc');
    expect(btn).toHaveAttribute('data-beginso-width', '700');
    expect(btn.getAttribute('data-beginso-params')).toMatch(/&preview=1$/);
    expect(btn).not.toHaveAttribute('data-beginso-side');
  });

  it('drawer carries side and drawer width, and says which edge it opens from', () => {
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'drawer', side: 'left', drawerWidth: 500 })} onMeasured={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'Open form' });
    expect(btn).toHaveAttribute('data-beginso-drawer', 'abc');
    expect(btn).toHaveAttribute('data-beginso-side', 'left');
    expect(btn).toHaveAttribute('data-beginso-width', '500');
    expect(screen.getByText(/drawer from the left/)).toBeInTheDocument();
  });

  it('styles the button from the colour and size settings', () => {
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'popup', buttonColor: '#FF0000', buttonSize: 'large' })} onMeasured={vi.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toMatch(/#ff0000|rgb\(255, 0, 0\)/i);
    expect(btn.style.padding).toBe('14px 26px');
  });

  it('loads the real embed.js once, even across remounts', () => {
    const { unmount } = render(<EmbedPreview ctx={ctx} config={cfg({ method: 'popup' })} onMeasured={vi.fn()} />);
    unmount();
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'drawer' })} onMeasured={vi.fn()} />);
    const scripts = document.querySelectorAll('script[data-beginso-preview]');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute('src', '/embed.js');
  });

  it('inline methods do not load embed.js', () => {
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'auto' })} onMeasured={vi.fn()} />);
    expect(document.querySelector('script[data-beginso-preview]')).toBeNull();
  });
});

describe('EmbedPreview: link', () => {
  it('explains there is nothing to embed and renders no frame or button', () => {
    render(<EmbedPreview ctx={ctx} config={cfg({ method: 'link' })} onMeasured={vi.fn()} />);
    expect(screen.getByText(/nothing to embed/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
  });
});
