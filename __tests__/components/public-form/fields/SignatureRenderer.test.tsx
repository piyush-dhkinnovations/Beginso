/**
 * SignatureRenderer — jsdom has no canvas, so getContext/toDataURL are mocked; the tests cover the
 * mode switch, the typed path, and what is written to the form on pointer-up / clear.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignatureRenderer } from '@/components/public-form/fields/SignatureRenderer';
import { Harness, makeField, readValues } from './harness';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const field = makeField({ type: 'signature', label: 'Sign here' });
const values = () => readValues(screen.getByTestId('values'));

let ctx: Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  ctx = {
    clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), drawImage: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ctx) as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(PNG);
  Element.prototype.setPointerCapture = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

const pad = () => screen.getByRole('img', { name: /signature pad/i });
const stroke = () => {
  fireEvent.pointerDown(pad(), { clientX: 5, clientY: 5, pointerId: 1 });
  fireEvent.pointerMove(pad(), { clientX: 20, clientY: 15, pointerId: 1 });
  fireEvent.pointerUp(pad(), { pointerId: 1 });
};

describe('SignatureRenderer', () => {
  it('defaults to Draw mode with a canvas and a disabled Clear button', () => {
    render(<Harness Renderer={SignatureRenderer} field={field} />);
    expect(screen.getByRole('button', { name: 'Draw' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Type' })).toHaveAttribute('aria-pressed', 'false');
    expect(pad()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear signature' })).toBeDisabled();
  });

  it('a drawn stroke stores the PNG data URL and enables Clear', () => {
    render(<Harness Renderer={SignatureRenderer} field={field} />);
    stroke();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(values()).toEqual({ f1: PNG });
    expect(screen.getByRole('button', { name: 'Clear signature' })).toBeEnabled();
  });

  it('moving the pointer without pressing draws nothing', () => {
    render(<Harness Renderer={SignatureRenderer} field={field} />);
    fireEvent.pointerMove(pad(), { clientX: 20, clientY: 15 });
    expect(ctx.lineTo).not.toHaveBeenCalled();
    expect(values()).toEqual({});
  });

  it('Clear wipes the canvas and the stored value', async () => {
    render(<Harness Renderer={SignatureRenderer} field={field} />);
    stroke();
    await userEvent.click(screen.getByRole('button', { name: 'Clear signature' }));
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(values()).toEqual({});
  });

  it('disabled: pressing does not start a stroke and the mode toggle is inert', () => {
    render(<Harness Renderer={SignatureRenderer} field={field} disabled />);
    fireEvent.pointerDown(pad(), { clientX: 5, clientY: 5 });
    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Type' })).toBeDisabled();
  });

  it('Type mode: shows a name input and an italic preview, storing the text', async () => {
    render(<Harness Renderer={SignatureRenderer} field={field} />);
    await userEvent.click(screen.getByRole('button', { name: 'Type' }));
    await userEvent.type(screen.getByPlaceholderText('Type your full name'), 'Asha Rao');
    expect(values()).toEqual({ f1: 'Asha Rao' });
    expect(screen.getAllByText('Asha Rao').length).toBeGreaterThan(0);
    expect(screen.queryByRole('img', { name: /signature pad/i })).not.toBeInTheDocument();
  });

  it('switching modes discards the other form of the answer', async () => {
    render(<Harness Renderer={SignatureRenderer} field={field} />);
    stroke();
    await userEvent.click(screen.getByRole('button', { name: 'Type' }));
    expect(values()).toEqual({});
    expect(screen.getByPlaceholderText('Type your full name')).toHaveValue('');
  });

  it('a typed value can never start with "data:" (stripped so it cannot pass as a drawing)', () => {
    render(<Harness Renderer={SignatureRenderer} field={field} />);
    fireEvent.click(screen.getByRole('button', { name: 'Type' }));
    fireEvent.change(screen.getByPlaceholderText('Type your full name'), { target: { value: 'data:image/png;base64,AAAA' } });
    expect(values()).toEqual({ f1: 'image/png;base64,AAAA' });
  });

  it('opens in Type mode when the restored value is plain text, and caps it at 100 chars', () => {
    render(<Harness Renderer={SignatureRenderer} field={field} defaultValues={{ f1: 'Asha Rao' }} />);
    expect(screen.getByRole('button', { name: 'Type' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByPlaceholderText('Type your full name')).toHaveValue('Asha Rao');
    expect(screen.getByPlaceholderText('Type your full name')).toHaveAttribute('maxlength', '100');
  });

  it('repaints a restored drawing in Draw mode without switching to Type', () => {
    render(<Harness Renderer={SignatureRenderer} field={field} defaultValues={{ f1: PNG }} />);
    expect(screen.getByRole('button', { name: 'Draw' })).toHaveAttribute('aria-pressed', 'true');
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Clear signature' })).toBeEnabled();
  });

  it('shows the validation error', () => {
    render(<Harness Renderer={SignatureRenderer} field={field} error={{ type: 'required', message: 'Signature required' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Signature required');
  });
});
