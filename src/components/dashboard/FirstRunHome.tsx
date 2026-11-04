import Link from 'next/link';
import { ArrowRight, Inbox, LayoutTemplate, PenLine, Plus, Share2 } from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { Illustration } from '@/components/illustrations/Illustration';
import { bx } from '@/lib/utils';

// First run of the Personal Home (no personal forms yet): one welcoming call to action with the illustration beside it, and the three steps as a path
// the person can start walking. Step 1 is a link (it lifts and its arrow moves on hover and focus); steps 2 and 3 happen after the form exists, so
// they are not links and say so. Motion is off for people who ask for less of it.

const STEPS = [
  { title: 'Build', body: 'Add questions in the builder, or start from a template.', icon: PenLine, href: '/forms/new', cta: 'Start building' },
  { title: 'Share', body: 'Publish and send the link to anyone — no account needed.', icon: Share2, note: 'After you publish' },
  { title: 'Collect', body: 'Responses land in your inbox, ready to review and export.', icon: Inbox, note: 'When the first answer arrives' },
] as const;

const lift = 'motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-200';

export function FirstRunHome() {
  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="first-form-heading" className="bg-card relative grid items-center gap-6 overflow-hidden p-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:p-10">
        {/* a soft wash of the accent colour behind the picture, so the card has a place to look at */}
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-(--accent-soft) opacity-70 blur-2xl" />
        <div className="relative flex flex-col items-start gap-4">
          <h2 id="first-form-heading" className="bg-h3 font-bold text-(--text-primary)">
            Create your first form
          </h2>
          <p className="max-w-prose bg-body text-(--text-secondary)">Build a form, share the link, and collect responses — all from one place.</p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/forms/new">
              <Plus size={16} className="mr-2" aria-hidden="true" />
              Create Form
            </ButtonLink>
            <ButtonLink href="/templates" variant="secondary">
              <LayoutTemplate size={16} className="mr-2" aria-hidden="true" />
              Browse templates
            </ButtonLink>
          </div>
        </div>
        <div className="relative flex justify-center">
          <Illustration name="onboarding" className="h-48! md:h-60!" />
        </div>
      </section>

      <ol aria-label="How it works" className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const body = (
            <>
              <span className="flex items-center justify-between gap-3">
                <span aria-hidden="true" className={bx('flex size-10 items-center justify-center rounded-full bg-(--accent-soft) text-(--action-primary)', 'href' in step && 'group-hover:bg-(--action-primary) group-hover:text-(--text-on-brand)', lift)}>
                  <Icon size={20} />
                </span>
                <span className="bg-caption font-semibold text-(--text-muted)">Step {i + 1}</span>
              </span>
              <span className="mt-1 block bg-body font-semibold text-(--text-primary)">{step.title}</span>
              <span className="block bg-body-sm text-(--text-muted)">{step.body}</span>
              {'href' in step ? (
                <span className="mt-2 inline-flex items-center gap-1 bg-body-sm font-semibold text-(--text-link)">
                  {step.cta}
                  <ArrowRight size={14} aria-hidden="true" className="motion-safe:transition-transform motion-safe:duration-200 group-hover:translate-x-1" />
                </span>
              ) : (
                <span className="mt-2 bg-caption text-(--text-disabled)">{step.note}</span>
              )}
            </>
          );
          return (
            <li key={step.title} className="flex">
              {'href' in step ? (
                <Link
                  href={step.href}
                  className={bx('bg-card group w-full gap-1 p-5 no-underline hover:border-(--action-primary) focus-visible:outline-2 focus-visible:outline-(--border-focus) motion-safe:hover:-translate-y-0.5 hover:shadow-(--shadow-md)', lift)}
                >
                  {body}
                </Link>
              ) : (
                <div className="bg-card w-full gap-1 p-5">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
