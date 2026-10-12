import { Stepper } from '@/components/ui/Stepper';
import { FormBanner } from '../FormBanner';
import { Backdrop, cardClass, widthClass, type LayoutFrameProps } from './shared';

// Steps: every form page is a NAMED step (a bare percentage tells the respondent nothing about what
// is left). The stepper sits in its own bordered strip so it reads as the primary navigation. Below 768 the step
// list collapses to "Step N of M". Back never clears entered values — values live in the shell's RHF state, not here.
export function StepsLayout({ branding, title, previewMode, stepNames, currentPage, children, hideCover, hideProgress }: LayoutFrameProps) {
  const steps = stepNames.map((label, i) => ({ label: label || `Step ${i + 1}` }));
  return (
    <Backdrop branding={branding} previewMode={previewMode}>
      <div className={cardClass(branding, widthClass('steps', branding))}>
        {!hideCover && <FormBanner branding={branding} title={title} />}
        {!hideProgress && steps.length > 1 && (
          <div className="border-b border-(--border-default) bg-(--bg-subtle) px-6 py-5 md:px-8">
            <Stepper steps={steps} currentStep={currentPage} className="hidden md:flex" aria-label="Form steps" />
            <p className="md:hidden bg-body-sm font-semibold text-(--text-secondary)">
              Step {currentPage + 1} of {steps.length} · {steps[currentPage]?.label}
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
