'use client';

import { useEffect, useRef, useState } from 'react';
import { Controller, type ControllerRenderProps } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { isDrawnSignature } from '@/lib/fieldDisplay';
import type { FieldRendererProps, FieldValue } from '@/types/publicForm';
import { FieldShell, FIELD_INPUT_CLASSES } from './FieldShell';

type Mode = 'draw' | 'type';

const WIDTH = 600;
const HEIGHT = 200;

/** Drawn → a PNG data URL; typed → the plain text. The backend accepts exactly those two shapes. */
function SignaturePad({ field, value, onChange, onBlur, disabled, invalid }: {
  field: FieldRendererProps['field'];
  value: FieldValue;
  onChange: ControllerRenderProps['onChange'];
  onBlur: () => void;
  disabled?: boolean;
  invalid: boolean;
}) {
  const [mode, setMode] = useState<Mode>(typeof value === 'string' && value !== '' && !isDrawnSignature(value) ? 'type' : 'draw');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  // Paint a restored/existing drawing back onto the canvas (e.g. after the review step re-renders the field).
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || mode !== 'draw') return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (isDrawnSignature(value)) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
      img.src = value;
    }
    // Only when the mode changes — painting on every stroke would erase the stroke in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * WIDTH, y: ((e.clientY - rect.top) / rect.height) * HEIGHT };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx || disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = point(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827'; // ink stays dark in both themes: the exported PNG has a transparent background
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(e.currentTarget.toDataURL('image/png'));
    onBlur();
  }

  function clear() {
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, WIDTH, HEIGHT);
    onChange(undefined);
  }

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    onChange(undefined); // the two forms are different answers; never carry one into the other
    setMode(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Signature method" className="bg-segmented self-start">
        {(['draw', 'type'] as const).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} disabled={disabled} onClick={() => switchMode(m)}>
            {m === 'draw' ? 'Draw' : 'Type'}
          </button>
        ))}
      </div>

      {mode === 'draw' ? (
        <>
          <canvas
            ref={canvasRef}
            id={field.fieldId}
            width={WIDTH}
            height={HEIGHT}
            role="img"
            aria-label="Signature pad — draw your signature with a mouse, finger or stylus, or switch to Type"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            // touch-none: a finger stroke must draw, not scroll the page.
            className={cn(
              'h-40 w-full touch-none rounded-md border-2 border-dashed bg-(--surface-card) cursor-crosshair',
              invalid ? 'border-(--error)' : 'border-(--border-default)',
              disabled && 'pointer-events-none opacity-60'
            )}
          />
          <button type="button" onClick={clear} disabled={disabled || !value} className="self-start bg-caption text-(--text-muted) underline hover:text-(--text-primary) disabled:no-underline disabled:opacity-50">
            Clear signature
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            id={field.fieldId}
            maxLength={100}
            autoComplete="off"
            placeholder="Type your full name"
            disabled={disabled}
            value={typeof value === 'string' && !isDrawnSignature(value) ? value : ''}
            // A typed value must never look like a data URL — the server would (rightly) refuse it.
            onChange={(e) => onChange(e.target.value.replace(/^data:/i, ''))}
            onBlur={onBlur}
            className={cn(FIELD_INPUT_CLASSES, invalid && 'border-(--error)')}
          />
          {typeof value === 'string' && value !== '' && (
            <p className="rounded-md bg-(--bg-subtle) px-3 py-2 font-serif text-2xl italic text-(--text-primary)">{value}</p>
          )}
        </>
      )}
    </div>
  );
}

export function SignatureRenderer({ field, control, error, disabled, inline }: FieldRendererProps) {
  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline}>
      <Controller
        name={field.fieldId}
        control={control}
        render={({ field: c }) => (
          <SignaturePad field={field} value={c.value} onChange={c.onChange} onBlur={c.onBlur} disabled={disabled} invalid={!!error} />
        )}
      />
    </FieldShell>
  );
}
