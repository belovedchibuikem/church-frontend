/** Client-side draft + post-auth helpers for the multi-step register / verify flows. */

const REGISTER_DRAFT_KEY = 'fhc.auth.registerDraft';
const PENDING_EMAIL_KEY = 'fhc.auth.pendingEmail';

export type RegisterDraft = {
  given_name?: string;
  middle_name?: string;
  family_name?: string;
  preferred_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  country_label?: string;
  region?: string;
  locality?: string;
  password?: string;
  password_confirmation?: string;
  about?: string;
  role?: string;
};

/** Passwords stay in memory for the tab session only — never written to storage. */
let passwordMemory: Pick<RegisterDraft, 'password' | 'password_confirmation'> = {};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function stripSecrets(draft: RegisterDraft): RegisterDraft {
  const { password: _p, password_confirmation: _c, ...safe } = draft;
  return safe;
}

export function readRegisterDraft(): RegisterDraft {
  let stored: RegisterDraft = {};
  if (canUseStorage()) {
    try {
      const raw = window.sessionStorage.getItem(REGISTER_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RegisterDraft;
        if (parsed && typeof parsed === 'object') stored = stripSecrets(parsed);
      }
    } catch {
      stored = {};
    }
  }
  return { ...stored, ...passwordMemory };
}

export function writeRegisterDraft(patch: RegisterDraft): RegisterDraft {
  if (patch.password !== undefined) passwordMemory.password = patch.password;
  if (patch.password_confirmation !== undefined) {
    passwordMemory.password_confirmation = patch.password_confirmation;
  }
  const next = { ...readRegisterDraft(), ...patch, ...passwordMemory };
  if (canUseStorage()) {
    window.sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(stripSecrets(next)));
  }
  return next;
}

export function clearRegisterDraft(): void {
  passwordMemory = {};
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(REGISTER_DRAFT_KEY);
}

export function setPendingAuthEmail(email: string): void {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(PENDING_EMAIL_KEY, email.trim().toLowerCase());
}

export function readPendingAuthEmail(): string | null {
  if (!canUseStorage()) return null;
  return window.sessionStorage.getItem(PENDING_EMAIL_KEY);
}

export function clearPendingAuthEmail(): void {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(PENDING_EMAIL_KEY);
}

function present(form: FormData, name: string): string | undefined {
  if (!form.has(name)) return undefined;
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : undefined;
}

function compactDraft(draft: RegisterDraft): RegisterDraft {
  const next: RegisterDraft = {};
  for (const [key, value] of Object.entries(draft) as Array<[keyof RegisterDraft, string | undefined]>) {
    if (value !== undefined) next[key] = value;
  }
  return next;
}

/** Map multi-step form names onto the Laravel register payload shape. */
export function draftFromFormData(form: FormData): RegisterDraft {
  const given = present(form, 'firstName') ?? present(form, 'given_name');
  const family = present(form, 'lastName') ?? present(form, 'family_name');
  const password = present(form, 'password');
  const confirm = present(form, 'confirm') ?? present(form, 'password_confirmation');
  const country = present(form, 'country');

  return compactDraft({
    given_name: given,
    middle_name: present(form, 'middle_name'),
    family_name: family,
    preferred_name: present(form, 'preferred_name'),
    email: present(form, 'email'),
    phone: present(form, 'phone'),
    country: country ? country.toUpperCase() : country,
    country_label: present(form, 'country_label'),
    region: present(form, 'region'),
    locality: present(form, 'locality'),
    password,
    password_confirmation: confirm,
    about: present(form, 'about'),
    role: present(form, 'role'),
  });
}

export function isRegisterDraftComplete(draft: RegisterDraft): draft is RegisterDraft & {
  given_name: string;
  family_name: string;
  email: string;
  password: string;
  password_confirmation: string;
} {
  return Boolean(
    draft.given_name?.trim() &&
      draft.family_name?.trim() &&
      draft.email?.trim() &&
      draft.password &&
      draft.password_confirmation,
  );
}
