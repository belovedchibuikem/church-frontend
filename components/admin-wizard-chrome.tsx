'use client';

import type { ReactNode } from 'react';
import { useAdminWizardStep } from '../lib/use-admin-wizard-step';

type StepperProps = {
  steps: string[];
  currentStep: number;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
  completeClassName?: string;
};

export function AdminWizardStepper({
  steps,
  currentStep,
  className = 'stepper',
  itemClassName = 'step',
  activeClassName = 'active',
  completeClassName = 'complete',
}: StepperProps) {
  return (
    <div className={className} role="list" aria-label="Form progress">
      {steps.map((step, index) => (
        <div
          role="listitem"
          className={`${itemClassName} ${index < currentStep ? completeClassName : ''} ${index === currentStep ? `${activeClassName} current` : ''}`.trim()}
          aria-current={index === currentStep ? 'step' : undefined}
          key={step}
        >
          <span aria-hidden="true">{index < currentStep ? '✓' : index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  );
}

type WizardShellProps = {
  steps: string[];
  stepperClassName?: string;
  stepperItemClassName?: string;
  children: (wizard: ReturnType<typeof useAdminWizardStep>) => ReactNode;
};

export function AdminWizardShell({ steps, stepperClassName, stepperItemClassName, children }: WizardShellProps) {
  const wizard = useAdminWizardStep(steps);
  return (
    <div data-admin-wizard="true">
      {steps.length > 0 && (
        <AdminWizardStepper
          steps={steps}
          currentStep={wizard.currentStep}
          className={stepperClassName}
          itemClassName={stepperItemClassName}
        />
      )}
      {children(wizard)}
    </div>
  );
}

type FooterProps = {
  wizard: ReturnType<typeof useAdminWizardStep>;
  nextLabel?: string;
  finishLabel?: string;
  cancelLabel?: string;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  onFinish?: () => void;
};

export function AdminWizardFooter({
  wizard,
  nextLabel,
  finishLabel = 'Finish',
  cancelLabel = 'Cancel',
  className = 'form-footer',
  primaryClassName = 'primary-button',
  secondaryClassName = 'ghost-button',
  onFinish,
}: FooterProps) {
  const nextStepLabel = !wizard.isLast
    ? (nextLabel && wizard.isFirst ? nextLabel : wizard.steps[wizard.currentStep + 1] ? `Next: ${wizard.steps[wizard.currentStep + 1]}` : 'Next')
    : finishLabel;

  return (
    <footer className={className}>
      {!wizard.isFirst ? (
        <button type="button" className={secondaryClassName} data-interaction-native="true" onClick={() => wizard.goToStep(wizard.currentStep - 1)}>
          Back
        </button>
      ) : (
        <button type="button" className={secondaryClassName} data-interaction-native="true">
          {cancelLabel}
        </button>
      )}
      <button
        type="button"
        className={primaryClassName}
        data-interaction-native="true"
        onClick={() => {
          if (wizard.isLast) onFinish?.();
          else wizard.goToStep(wizard.currentStep + 1);
        }}
      >
        {wizard.isLast ? finishLabel : nextStepLabel}
      </button>
    </footer>
  );
}
