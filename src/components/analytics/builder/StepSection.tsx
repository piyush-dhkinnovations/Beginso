import type { ReactNode } from 'react';

/** One titled group inside a step: what it is, a line saying what it is for, then its controls. Sections of a step are divided by a rule. */
export function StepSection({ title, description, children, id }: { title: string; description?: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-(--border-subtle) pt-6 first:border-0 first:pt-0">
      <header className="flex flex-col gap-0.5">
        <h3 id={id} className="bg-body font-semibold text-(--text-primary)">
          {title}
        </h3>
        {description && <p className="bg-body-sm text-(--text-muted)">{description}</p>}
      </header>
      {children}
    </section>
  );
}
