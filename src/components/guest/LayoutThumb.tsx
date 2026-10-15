import type { CSSProperties } from 'react';
import { LAYOUT_LOOKS } from '@/lib/layoutPresets';
import type { LayoutPreset } from '@/types/form';

// A tiny, static drawing of a form in one of the six layouts, filled with the template's own questions. Each layout is
// drawn differently so the pick screen shows real variety, and each takes its colour from that layout's own look.
const box = 'rounded-sm border border-(--border-default) bg-(--surface-card)';
const input = <div className="h-3 rounded-sm border border-(--border-default) bg-(--bg-subtle)" />;

function Field({ label }: { label: string }) {
  return (
    <div>
      <div className="mb-0.5 truncate text-[9px] leading-3 font-medium text-(--text-secondary)">{label}</div>
      {input}
    </div>
  );
}

export function LayoutThumb({ layout, title, labels }: { layout: LayoutPreset; title: string; labels: string[] }) {
  const c = LAYOUT_LOOKS[layout].color;
  const tint = { backgroundColor: `color-mix(in srgb, ${c} 14%, white)` } as CSSProperties;
  const solid = { backgroundColor: c } as CSSProperties;
  const q = labels.length ? labels : ['Your first question'];
  const f = (n: number) => q.slice(0, n).map((l, i) => <Field key={i} label={l} />);
  const button = <div className="h-3.5 w-14 rounded-sm" style={solid} />;

  let body: React.ReactNode;
  switch (layout) {
    case 'card_stack':
      body = (
        <div className="flex h-full flex-col gap-1.5 p-2.5" style={tint}>
          <div className="truncate text-[10px] font-bold text-(--text-primary)">{title}</div>
          {q.slice(0, 2).map((l, i) => (
            <div key={i} className={`${box} p-1.5`}><Field label={l} /></div>
          ))}
          {button}
        </div>
      );
      break;
    case 'guided':
      body = (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
          <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className="h-1 w-5 rounded-full" style={i === 0 ? solid : { backgroundColor: 'var(--border-default)' }} />)}</div>
          <div className="line-clamp-2 text-[11px] font-bold text-(--text-primary)">{q[0]}</div>
          <div className="h-4 w-4/5 rounded-sm border border-(--border-default) bg-(--bg-subtle)" />
          {button}
        </div>
      );
      break;
    case 'steps':
      body = (
        <div className="flex h-full flex-col gap-2 p-2.5">
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((n) => (
              <span key={n} className="flex items-center gap-1">
                <span className="flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white" style={n === 1 ? solid : { backgroundColor: 'var(--border-strong)' }}>{n}</span>
                {n < 3 && <span className="h-px w-6 bg-(--border-strong)" />}
              </span>
            ))}
          </div>
          <div className="truncate text-[10px] font-bold text-(--text-primary)">{title}</div>
          {f(2)}
          <div className="mt-auto self-end">{button}</div>
        </div>
      );
      break;
    case 'split_feature':
      body = (
        <div className="flex h-full">
          <div className="flex w-2/5 flex-col justify-end p-2 text-white" style={solid}>
            <div className="line-clamp-3 text-[10px] leading-3 font-bold">{title}</div>
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-2.5">{f(2)}<div className="mt-auto">{button}</div></div>
        </div>
      );
      break;
    case 'compact':
      body = (
        <div className="flex h-full flex-col gap-1.5 p-2.5">
          <div className="truncate text-[10px] font-bold text-(--text-primary)">{title}</div>
          <div className="grid grid-cols-2 gap-1.5">{f(4)}</div>
          <div className="mt-auto">{button}</div>
        </div>
      );
      break;
    default:
      body = (
        <div className="flex h-full flex-col">
          <div className="truncate px-2.5 py-2 text-[10px] font-bold text-white" style={solid}>{title}</div>
          <div className="flex flex-1 flex-col gap-1.5 p-2.5">{f(2)}<div className="mt-auto">{button}</div></div>
        </div>
      );
  }

  return (
    <div aria-hidden="true" className="h-full overflow-hidden rounded-md border border-(--border-default) bg-(--surface-card) shadow-(--shadow-sm)">
      {body}
    </div>
  );
}
