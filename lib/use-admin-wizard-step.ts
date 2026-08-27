'use client';

import { useCallback, useEffect, useState } from 'react';

export const WIZARD_ADVANCE_EVENT = 'fhc-admin-wizard-advance';

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function readStepIndex(steps: string[]): number {
  if (typeof window === 'undefined' || steps.length === 0) return 0;
  const url = new URL(window.location.href);
  const requested = url.searchParams.get('step') ?? url.searchParams.get('tab');
  if (!requested) return 0;
  const index = steps.findIndex((step) => slug(step) === requested);
  return index >= 0 ? index : 0;
}

function writeStepIndex(steps: string[], index: number) {
  const url = new URL(window.location.href);
  if (index <= 0) {
    url.searchParams.delete('step');
    url.searchParams.delete('tab');
  } else {
    url.searchParams.set('step', slug(steps[index]));
    url.searchParams.delete('tab');
  }
  window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function useAdminWizardStep(steps: string[] = []) {
  const [currentStep, setCurrentStep] = useState(() => readStepIndex(steps));

  useEffect(() => {
    setCurrentStep(readStepIndex(steps));
  }, [steps]);

  useEffect(() => {
    const sync = () => setCurrentStep(readStepIndex(steps));
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [steps]);

  useEffect(() => {
    const onAdvance = (event: Event) => {
      const detail = (event as CustomEvent<{ direction?: 'next' | 'back' }>).detail;
      setCurrentStep((previous) => {
        const nextIndex = detail?.direction === 'back'
          ? Math.max(0, previous - 1)
          : Math.min(steps.length - 1, previous + 1);
        writeStepIndex(steps, nextIndex);
        return nextIndex;
      });
    };
    window.addEventListener(WIZARD_ADVANCE_EVENT, onAdvance);
    return () => window.removeEventListener(WIZARD_ADVANCE_EVENT, onAdvance);
  }, [steps]);

  const goToStep = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, Math.max(steps.length - 1, 0)));
    setCurrentStep(clamped);
    writeStepIndex(steps, clamped);
  }, [steps]);

  return {
    currentStep,
    currentLabel: steps[currentStep] ?? '',
    steps,
    goToStep,
    isFirst: currentStep === 0,
    isLast: currentStep >= steps.length - 1,
  };
}

export function isInPageWizardKind(kind?: string): boolean {
  return kind === 'wizard' || kind === 'workflow';
}
