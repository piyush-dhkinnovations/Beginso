import type { ReactNode } from 'react';
import { BarChart3, Building2, ImageIcon, Link2, Type, Users } from 'lucide-react';

// Decorative illustrations for the create flows: one calm "product" card in the middle, a few floating chips
// around it joined by faint dashed lines. Pure markup, no images, theme tokens only (so dark mode works).
// Each piece rises in on load and then floats gently, with a different delay so they never move in step.

function Chip({ icon, label, className, delay }: { icon: ReactNode; label: string; className: string; delay: string }) {
  return (
    <div className={`absolute ${className}`}>
      <div
        className="animate-pop-in"
        style={{ animationDelay: delay }}
      >
        <div className="animate-float flex items-center gap-2.5 rounded-xl border border-(--border-default) bg-(--surface-card) py-2 pl-2 pr-4 shadow-(--shadow-md)" style={{ animationDelay: delay }}>
          <span className="flex size-8 items-center justify-center rounded-lg bg-(--accent-soft) text-(--accent-soft-text) [&_svg]:size-4">{icon}</span>
          <span className="bg-body-sm font-semibold text-(--text-primary)">{label}</span>
        </div>
      </div>
    </div>
  );
}

function Lines() {
  return (
    <svg className="absolute inset-0 size-full text-white/40" fill="none" aria-hidden="true">
      <path d="M 18% 30% C 18% 44%, 30% 40%, 36% 46%" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 6" />
      <path d="M 84% 52% C 84% 66%, 72% 62%, 66% 70%" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 6" />
      <path d="M 16% 74% C 22% 62%, 30% 66%, 36% 62%" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 6" />
    </svg>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="relative h-[30rem] w-full max-w-2xl">{children}</div>;
}

const row = 'h-9 rounded-md border border-(--border-default) bg-(--bg-subtle)';

export function FormIllustration() {
  return (
    <Frame>
      <Lines />
      <div className="animate-pop-in absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 -rotate-1">
        <div className="rounded-2xl border border-(--border-default) bg-(--surface-card) p-5 shadow-(--shadow-lg)">
          {/* eslint-disable-next-line @next/next/no-img-element -- local brand mark */}
          <img src="/favicon.svg" alt="" className="size-7" />
          <p className="mt-4 bg-h5 font-bold text-(--text-primary)">Event Registration</p>
          <p className="bg-caption text-(--text-muted)">A simple form for your event</p>
          <div className="mt-4 flex flex-col gap-3">
            <div><p className="mb-1 bg-caption font-semibold text-(--text-primary)">Full Name</p><div className={row} /></div>
            <div><p className="mb-1 bg-caption font-semibold text-(--text-primary)">Email Address</p><div className={row} /></div>
            <div><p className="mb-1 bg-caption font-semibold text-(--text-primary)">Ticket Type</p><div className={row} /></div>
          </div>
          <div className="mt-5 flex h-10 items-center justify-center rounded-md bg-(--action-primary) bg-body-sm font-semibold text-white">Submit</div>
        </div>
      </div>
      <Chip icon={<Type />} label="Add questions" className="left-[4%] top-[12%]" delay="0.15s" />
      <Chip icon={<ImageIcon />} label="Collect images" className="left-[2%] top-[70%]" delay="0.35s" />
      <Chip icon={<Link2 />} label="Share anywhere" className="right-[2%] top-[44%]" delay="0.55s" />
      <Chip icon={<BarChart3 />} label="View responses" className="bottom-[8%] right-[6%]" delay="0.75s" />
    </Frame>
  );
}

export function WorkspaceIllustration() {
  const names = ['Marketing', 'Product', 'Support'];
  return (
    <Frame>
      <Lines />
      <div className="animate-pop-in absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 rotate-1">
        <div className="rounded-2xl border border-(--border-default) bg-(--surface-card) p-4 shadow-(--shadow-lg)">
          <div className="flex items-center gap-3 rounded-xl border border-(--border-default) bg-(--bg-subtle) p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local brand mark */}
            <img src="/favicon.svg" alt="" className="size-10 rounded-lg bg-(--surface-card) p-1.5" />
            <div className="min-w-0">
              <p className="truncate bg-body-sm font-semibold text-(--text-primary)">Your workspace</p>
              <p className="bg-caption text-(--text-muted)">Owner · 3 members</p>
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {['Forms', 'Responses', 'Templates', 'Team'].map((item, i) => (
              <li key={item} className={`flex h-9 items-center gap-2.5 rounded-md px-3 bg-body-sm ${i === 0 ? 'bg-(--accent-soft) font-semibold text-(--accent-soft-text)' : 'text-(--text-secondary)'}`}>
                <span className="size-3.5 rounded-sm bg-current opacity-30" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Chip icon={<Users />} label="Invite your team" className="left-[3%] top-[14%]" delay="0.15s" />
      <Chip icon={<Building2 />} label={names[0] + ' · ' + names[1] + ' · ' + names[2]} className="left-[4%] top-[74%]" delay="0.4s" />
      <Chip icon={<BarChart3 />} label="Shared insights" className="right-[3%] top-[48%]" delay="0.65s" />
    </Frame>
  );
}
