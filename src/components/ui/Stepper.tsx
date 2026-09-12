import React from "react";
import { bx } from "@/lib/utils";

export interface StepperStep {
  label: string;
  description?: string;
}

export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: StepperStep[];
  currentStep: number;
}

// beginso-ui.css §12 NAVIGATION ("Stepper").
export function Stepper({ steps, currentStep, className, ...props }: StepperProps) {
  return (
    <ol className={bx("bg-stepper", className)} {...props}>
      {steps.map((step, i) => {
        const isDone = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <li
            key={step.label}
            className={bx("bg-step", isDone && "is-done", isCurrent && "is-current")}
            aria-current={isCurrent ? "step" : undefined}
          >
            <div className="bg-step-marker">
              <span className="bg-step-dot">{i + 1}</span>
              <span className="bg-step-bar" />
            </div>
            <div className="bg-step-text">
              <strong>{step.label}</strong>
              {step.description && <small>{step.description}</small>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
