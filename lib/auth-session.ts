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

/** Map multi-step form names onto the Laravel register payload shape. */
export function draftFromFormData(form: FormData): RegisterDraft {
  const str = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' ? value.trim() : undefined;
  };

  const given = str('firstName') ?? str('given_name');
  const family = str('lastName') ?? str('family_name');
  const password = str('password');
  const confirm = str('confirm') ?? str('password_confirmation');

  return {
    given_name: given,
    middle_name: str('middle_name'),
    family_name: family,
    preferred_name: str('preferred_name'),
    email: str('email'),
    phone: str('phone'),
    password,
    password_confirmation: confirm,
    about: str('about'),
    role: str('role'),
  };
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
