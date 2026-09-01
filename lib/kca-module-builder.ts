export const KCA_MODULE_FORM_FIELDS = ['title', 'code', 'sequence', 'duration_days', 'is_active', 'lecturer_person_id'] as const;

export type KcaModuleFormValues = Partial<Record<(typeof KCA_MODULE_FORM_FIELDS)[number] | `${string}_label` | `${string}_name`, string>>;

export function captureKcaModuleFormValues(
  container: ParentNode | null,
  existing: KcaModuleFormValues = {},
): KcaModuleFormValues {
  const nextValues: KcaModuleFormValues = { ...existing };
  container?.querySelectorAll('input[name], select[name], textarea[name]').forEach((node) => {
    const el = node as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!el.name) return;
    if (el.type === 'checkbox') {
      nextValues[el.name] = (el as HTMLInputElement).checked ? 'true' : '';
    } else {
      nextValues[el.name] = el.value;
    }
  });
  return nextValues;
}

export function validateKcaModuleFormValues(values: KcaModuleFormValues): string | null {
  const code = values.code?.trim();
  const title = values.title?.trim();
  const sequence = values.sequence?.trim();
  const durationDays = values.duration_days?.trim();
  if (!code || !title || !sequence || !durationDays) {
    return 'Module code, title, sequence, and learning days are required. Return to Basic Info and complete those fields.';
  }
  const sequenceNumber = Number(sequence);
  const durationNumber = Number(durationDays);
  if (!Number.isFinite(sequenceNumber) || sequenceNumber < 1) {
    return 'Sequence must be a number of 1 or greater.';
  }
  if (!Number.isFinite(durationNumber) || durationNumber < 1 || durationNumber > 365) {
    return 'Learning days must be a number between 1 and 365.';
  }
  return null;
}

export function kcaModuleMutationPayload(values: KcaModuleFormValues): Record<string, string> {
  return {
    code: values.code?.trim() ?? '',
    title: values.title?.trim() ?? '',
    sequence: values.sequence?.trim() ?? '',
    duration_days: values.duration_days?.trim() ?? '',
  };
}
