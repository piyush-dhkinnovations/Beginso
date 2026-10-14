import { CalendarDays, MessageCircle, Send, Star, Upload, User } from 'lucide-react';
import type { Template } from '@/types/form';
import { TemplateFormSheet } from '@/components/templates/TemplateFormSheet';

// The picture on a template card. Not one skeleton for everything: each kind of template is drawn in the layout that kind of
// form really has (an event ticket, a rating survey, an application with a CV slot, a stepped form, a chat-style enquiry, or a
// plain sheet), filled with that template's own question labels.

export type ThumbVariant = 'sheet' | 'ticket' | 'survey' | 'profile' | 'steps' | 'chat';

const BY_CATEGORY: Record<string, ThumbVariant> = {
  general: 'sheet',
  events: 'ticket',
  event: 'ticket',
  feedback: 'survey',
  hr: 'profile',
  hiring: 'profile',
  advanced: 'steps',
  sales: 'chat',
  contact: 'chat',
};
const ALL: ThumbVariant[] = ['sheet', 'ticket', 'survey', 'profile', 'steps', 'chat'];

/** Known categories map to their layout; an unknown one gets a stable pick from its id, so it never changes between renders. */
export function thumbVariant(template: Template): ThumbVariant {
  const known = BY_CATEGORY[template.category.toLowerCase()];
  if (known) return known;
  const sum = [...template._id].reduce((n, c) => n + c.charCodeAt(0), 0);
  return ALL[sum % ALL.length];
}

const frame = 'relative h-32 w-60 max-w-full overflow-hidden rounded-lg border border-(--border-default) bg-(--surface-card) shadow-(--shadow-sm)';
const input = 'h-6 rounded border border-(--border-default) bg-(--bg-subtle)';
const labels = (t: Template) => t.fields.filter((f) => !f.deleted).map((f) => f.label);
const Fade = () => <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-(--surface-card) to-transparent" />;

function Line({ ink, w }: { ink: string; w: string }) {
  return <div className={`h-1.5 rounded-full ${w}`} style={{ backgroundColor: ink }} />;
}

export function TemplateThumb({ template, ink, surface }: { template: Template; ink: string; surface: string }) {
  const names = labels(template);
  const variant = thumbVariant(template);

  if (variant === 'ticket') {
    return (
      <div aria-hidden="true" className={`${frame} flex`}>
        <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 border-r border-dashed border-(--border-strong)" style={{ backgroundColor: surface, color: ink }}>
          <CalendarDays size={22} />
          <span className="bg-caption font-semibold">RSVP</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
          <Line ink={ink} w="w-20" />
          {names.slice(0, 2).map((n) => (
            <div key={n}>
              <p className="m-0 mb-1 truncate bg-caption text-(--text-secondary)">{n}</p>
              <div className={input} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'survey') {
    return (
      <div aria-hidden="true" className={`${frame} flex flex-col gap-2 p-3`}>
        <p className="m-0 truncate bg-label text-(--text-primary)">{names[0] ?? template.name}</p>
        <div className="flex gap-1" style={{ color: ink }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={22} fill={i < 4 ? 'currentColor' : 'none'} />
          ))}
        </div>
        <p className="m-0 truncate bg-caption text-(--text-muted)">{names[1] ?? 'Tell us more'}</p>
        <div className="h-8 rounded border border-(--border-default) bg-(--bg-subtle)" />
        <Fade />
      </div>
    );
  }

  if (variant === 'profile') {
    return (
      <div aria-hidden="true" className={`${frame} flex flex-col gap-2 p-3`}>
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: surface, color: ink }}>
            <User size={18} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="m-0 truncate bg-label text-(--text-primary)">{names[0] ?? template.name}</p>
            <Line ink={ink} w="w-20" />
          </div>
        </div>
        <div className={`${input} flex items-center px-2 bg-caption text-(--text-muted)`}>{names[1] ?? 'Email'}</div>
        <div className="flex items-center justify-center gap-1.5 rounded border border-dashed border-(--border-strong) py-2 bg-caption text-(--text-muted)">
          <Upload size={12} /> Attach CV
        </div>
        <Fade />
      </div>
    );
  }

  if (variant === 'steps') {
    return (
      <div aria-hidden="true" className={`${frame} flex flex-col gap-2 p-3`}>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: i === 0 ? ink : 'var(--border-default)' }} />
          ))}
          <span className="ml-1 bg-caption text-(--text-muted)">1/3</span>
        </div>
        {names.slice(0, 2).map((n) => (
          <div key={n}>
            <p className="m-0 mb-1 truncate bg-caption text-(--text-secondary)">{n}</p>
            <div className={input} />
          </div>
        ))}
        <div className="ml-auto flex h-5 w-14 items-center justify-center rounded bg-caption font-semibold" style={{ backgroundColor: ink, color: 'var(--text-on-brand)' }}>
          Next
        </div>
      </div>
    );
  }

  if (variant === 'chat') {
    return (
      <div aria-hidden="true" className={`${frame} flex flex-col justify-between gap-1.5 p-3`}>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 bg-caption font-semibold" style={{ color: ink }}>
            <MessageCircle size={14} />
            <span className="truncate">{template.name}</span>
          </div>
          <div className="w-4/5 rounded-xl rounded-tl-sm px-2.5 py-1.5 bg-caption text-(--text-primary)" style={{ backgroundColor: surface }}>
            <span className="line-clamp-1">{names[0] ?? 'Your name'}</span>
          </div>
          <div className="ml-auto w-3/5 rounded-xl rounded-tr-sm border border-(--border-default) px-2.5 py-1.5 bg-caption text-(--text-muted)">
            <span className="line-clamp-1">{names[1] ?? 'Your message'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`${input} flex-1`} />
          <span className="flex size-6 items-center justify-center rounded-full" style={{ backgroundColor: ink, color: 'var(--text-on-brand)' }}>
            <Send size={12} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={`${frame} p-3`}>
      <div className="mb-2.5">
        <Line ink={ink} w="w-16" />
      </div>
      <TemplateFormSheet fields={template.fields} compact />
      <Fade />
    </div>
  );
}
