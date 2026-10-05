import { Stepper } from '@/components/ui/Stepper';
import { FormBanner } from '../FormBanner';
import { Backdrop, type LayoutFrameProps } from './shared';

// Steps: every form page is a NAMED step (a bare percentage tells the respondent nothing about what
// is left). Below 768 the step list collapses to "Step N of M". Back never clears entered values —
// values live in the shell's RHF state, not here.
export function StepsLayout({ branding, previewMode, stepNames, currentPage, children }: LayoutFrameProps) {
  const steps = stepNames.map((label, i) => ({ label: label || `Step ${i + 1}` }));
  return (
    <Backdrop previewMode={previewMode}>
      <div className="bg-(--surface-card) rounded-xl border border-(--border-default) shadow-(--shadow-sm) w-full overflow-hidden max-w-170">
        <FormBanner branding={branding} />
        {steps.length > 1 && (
          <div className="px-6 pt-5">
            <Stepper steps={steps} currentStep={currentPage} className="hidden md:flex" aria-label="Form steps" />
            <p className="md:hidden bg-caption font-semibold text-(--text-muted)">
              Step {currentPage + 1} of {steps.length}
            </p>
            {/* Progress must be announced on change (wireframe a11y note). */}
            <p role="status" className="sr-only">
              Step {currentPage + 1} of {steps.length}: {steps[currentPage]?.label}
            </p>
          </div>
        )}
        {children}
      </div>
    </Backdrop>
  );
}
