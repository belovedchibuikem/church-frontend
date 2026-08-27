'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppBrand } from '@/components/app-brand';
import { formFieldsFor, type FormField } from '@/lib/site-content';
import { flowNext, registerSteps } from '@/lib/site-flow';
import {
  AuthApiError,
  challengeMfa,
  confirmMfaTotp,
  fetchBrowserUser,
  formatAuthError,
  isAuthApiConfigured,
  loginBrowserUser,
  logoutBrowserUser,
  type MfaEnrollment,
  registerBrowserUser,
  requestPasswordReset,
  resetPassword,
  sendEmailVerificationNotification,
  setupMfaTotp,
  verifyEmail,
} from '@/lib/auth-api';
import {
  clearPendingAuthEmail,
  clearRegisterDraft,
  draftFromFormData,
  isRegisterDraftComplete,
  readPendingAuthEmail,
  readRegisterDraft,
  setPendingAuthEmail,
  writeRegisterDraft,
} from '@/lib/auth-session';

const languages = [
  ['🇬🇧', 'English'],
  ['🇫🇷', 'French'],
  ['🇪🇸', 'Spanish'],
  ['🇸🇦', 'Arabic'],
  ['🇨🇳', 'Chinese'],
  ['🇵🇹', 'Portuguese'],
  ['🇳🇬', 'Hausa'],
  ['🇳🇬', 'Yoruba'],
  ['🇳🇬', 'Igbo'],
  ['🇰🇪', 'Kiswahili'],
  ['🇷🇺', 'Russian'],
  ['🇩🇪', 'German'],
] as const;

const roles = [
  ['Member', 'Belong to a church and grow in community'],
  ['Volunteer / Worker', 'Serve in departments and ministry teams'],
  ['KCA Student', 'Train for Kingdom leadership and impact'],
  ['Leader / Pastor', 'Shepherd people and oversee ministry'],
] as const;

const recoveryOptions = [
  ['Reset password by email', 'Calls POST /auth/password/forgot. Delivery depends on Laravel mail being configured.', '/forgot-password'],
  ['MFA recovery code', 'Use a one-time recovery code from authenticator setup via POST /auth/mfa/challenge.', '/otp?mode=recovery'],
] as const;

function AuthBanner({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  return (
    <p className={`auth-banner auth-banner-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

function Field({
  field,
  error,
  defaultValue,
}: {
  field: FormField;
  error?: string;
  defaultValue?: string;
}) {
  const className = [field.wide ? 'wide' : undefined, error ? 'has-error' : undefined].filter(Boolean).join(' ') || undefined;
  const value = defaultValue ?? '';
  const inputType =
    field.type === 'text' && field.name.includes('password')
      ? 'password'
      : field.type === 'password'
        ? 'password'
        : (field.type ?? 'text');

  if (field.type === 'textarea') {
    return (
      <label className={className}>
        {field.label}
        <textarea name={field.name} defaultValue={value} rows={5} required aria-invalid={Boolean(error)} />
        {error ? <span className="field-error">{error}</span> : null}
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <label className={className}>
        {field.label}
        <select name={field.name} defaultValue={value || field.value} required aria-invalid={Boolean(error)}>
          {(field.options ?? []).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        {error ? <span className="field-error">{error}</span> : null}
      </label>
    );
  }
  return (
    <label className={className}>
      {field.label}
      <input
        name={field.name}
        type={inputType === 'search-select' ? 'text' : inputType}
        defaultValue={value}
        required={field.name !== 'confirm' && field.name !== 'middle_name'}
        autoComplete={
          field.name.includes('password')
            ? field.name.includes('confirm')
              ? 'new-password'
              : field.name === 'password'
                ? 'current-password'
                : 'new-password'
            : field.name === 'email' || field.name === 'identity'
              ? 'email'
              : undefined
        }
        aria-invalid={Boolean(error)}
      />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

function AuthBrand({ route }: { route: SiteRoute }) {
  const register = route.path.includes('/register');
  const recovery = route.path.includes('forgot') || route.path.includes('reset') || route.path.includes('recovery');
  const verify = route.path.includes('verify') || route.path.includes('/otp');
  const title = register
    ? 'One Account. All Ministries.'
    : recovery
      ? 'Trouble signing in?'
      : verify
        ? 'Secure verification'
        : route.path.includes('/mfa')
          ? 'Protect your account'
          : route.path.includes('/onboarding')
            ? 'Set up your journey'
            : 'Welcome Back';
  const body = register
    ? 'Create your Family House Connect account and access church, mission, KCA, giving, and growth in one place.'
    : recovery
      ? 'No worries. We will help you get safely back into your account.'
      : verify
        ? 'Confirm it is really you before continuing your Kingdom journey.'
        : 'Your church, mission, KCA, giving, and growth — in one place.';
  return (
    <aside className="auth-brand">
      <AppBrand variant="auth" />
      <h2>{title}</h2>
      <p>{body}</p>
      <ul className="check-list light">
        <li>One account across every ministry</li>
        <li>Email verification</li>
        <li>Optional multi-factor security</li>
      </ul>
    </aside>
  );
}

function AuthTabs({ active }: { active: 'signin' | 'register' }) {
  return (
    <div className="auth-tabs">
      <Link className={active === 'signin' ? 'active' : ''} href="/login">
        Sign In
      </Link>
      <Link className={active === 'register' ? 'active' : ''} href="/register">
        Create Account
      </Link>
    </div>
  );
}

function RegisterStepper({ path }: { path: string }) {
  const current = Math.max(
    0,
    registerSteps.findIndex(([stepPath]) => path === stepPath || (path === '/register' && stepPath === '/register/personal')),
  );
  return (
    <aside className="auth-stepper">
      <h3>Create Account</h3>
      {registerSteps.map(([stepPath, label], index) => (
        <Link className={index < current ? 'done' : index === current ? 'active' : ''} href={stepPath} key={stepPath}>
          <span>{index < current ? '✓' : index + 1}</span>
          <b>{label}</b>
        </Link>
      ))}
    </aside>
  );
}

function OtpInputs({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const update = (index: number, nextValue: string) => {
    const clean = nextValue.replace(/\D/g, '');
    if (!clean) {
      const next = [...value];
      next[index] = '';
      onChange(next);
      return;
    }
    if (clean.length > 1) {
      const next = [...value];
      for (let i = 0; i < 6; i += 1) next[i] = clean[i] ?? '';
      onChange(next);
      refs.current[Math.min(clean.length, 5)]?.focus();
      return;
    }
    const next = [...value];
    next[index] = clean;
    onChange(next);
    if (index < 5) refs.current[index + 1]?.focus();
  };

  return (
    <div className="otp-row" role="group" aria-label="Verification code">
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          inputMode="numeric"
          maxLength={6}
          value={digit}
          aria-label={`Digit ${index + 1}`}
          onChange={(event) => update(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !value[index] && index > 0) refs.current[index - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}

function PasswordRules({ password = '' }: { password?: string }) {
  const rules = [
    ['12+ characters', password.length >= 12],
    ['One uppercase letter', /[A-Z]/.test(password)],
    ['One lowercase letter', /[a-z]/.test(password)],
    ['One number', /\d/.test(password)],
    ['One special character', /[^A-Za-z0-9]/.test(password)],
  ] as const;
  return (
    <ul className="password-rules">
      {rules.map(([label, ok]) => (
        <li className={ok ? 'ok' : ''} key={label}>
          {ok ? '✓' : '○'} {label}
        </li>
      ))}
    </ul>
  );
}

function continueTo(router: ReturnType<typeof useRouter>, path: string) {
  router.push(flowNext[path] ?? '/account');
}

function ApiConfigMissing() {
  return (
    <AuthBanner tone="error">
      Authentication is not configured. Set <code>NEXT_PUBLIC_FHC_API_URL</code> (…/api/v1) or{' '}
      <code>NEXT_PUBLIC_FHC_API_BASE_URL</code> (origin) for your Laravel API.
    </AuthBanner>
  );
}

/** POST /auth/logout then return to sign-in. Used by /logout and member sidebar. */
export function LogoutScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isAuthApiConfigured()) {
        if (!cancelled) {
          setError('Authentication API is not configured.');
          setBusy(false);
        }
        return;
      }
      try {
        await logoutBrowserUser();
        clearPendingAuthEmail();
        clearRegisterDraft();
        if (!cancelled) router.replace('/login');
      } catch (err) {
        if (!cancelled) {
          setError(formatAuthError(err));
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <AppBrand variant="auth" />
        <h2>Signing out</h2>
        <p>Ending your secure browser session.</p>
      </aside>
      <div className="site-form auth-form auth-center">
        {error ? <AuthBanner tone="error">{error}</AuthBanner> : null}
        <p className="auth-copy">{busy ? 'Signing you out…' : 'Sign-out did not complete.'}</p>
        {!busy ? (
          <div className="form-actions" style={{ justifyContent: 'center' }}>
            <Link className="site-button" href="/login">
              Back to Sign In
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Live logout control for member chrome (POST /auth/logout). */
export function MemberLogoutButton({ className = 'logout' }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={() => {
        setBusy(true);
        router.push('/logout');
      }}
    >
      ↪ {busy ? 'Signing out…' : 'Logout'}
    </button>
  );
}

export function AuthScreen({ route }: { route: SiteRoute }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [language, setLanguage] = useState('English');
  const [role, setRole] = useState('Member');
  const [passwordPreview, setPasswordPreview] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [otpMode, setOtpMode] = useState<'totp' | 'recovery'>('totp');
  const [pendingEmail, setPendingEmailState] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [mfaEnrollment, setMfaEnrollment] = useState<MfaEnrollment | null>(null);
  const [mfaSetupLoading, setMfaSetupLoading] = useState(false);
  const fields = formFieldsFor(route.path);
  const path = route.path;
  const apiReady = isAuthApiConfigured();

  useEffect(() => {
    setPendingEmailState(readPendingAuthEmail());
  }, [path]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (path === '/reset-password') {
      setResetToken(params.get('token') ?? '');
      setResetEmail(params.get('email') ?? '');
    }
    if (path === '/otp') {
      setOtpMode(params.get('mode') === 'recovery' ? 'recovery' : 'totp');
    }
  }, [path]);

  useEffect(() => {
    if (path !== '/verify-email' || !apiReady || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const hash = params.get('hash');
    const expires = params.get('expires');
    const signature = params.get('signature');
    if (!id || !hash || !expires || !signature) return;

    let cancelled = false;
    setBusy(true);
    setError(null);
    void verifyEmail({ id, hash, expires, signature })
      .then(() => {
        if (cancelled) return;
        setSuccess('Email verified. You can continue.');
        setDone(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setFieldErrors(err instanceof AuthApiError ? err.fieldErrors : {});
          setError(formatAuthError(err));
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, apiReady]);

  useEffect(() => {
    if (!(path.includes('/verify-email') || path.includes('/otp') || path.includes('/verify-phone'))) return;
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [path, seconds]);

  useEffect(() => {
    if (path !== '/mfa/setup' || !apiReady) return;
    let cancelled = false;
    setMfaSetupLoading(true);
    setError(null);
    void setupMfaTotp('Authenticator')
      .then((enrollment) => {
        if (!cancelled) setMfaEnrollment(enrollment);
      })
      .catch((err) => {
        if (!cancelled) setError(formatAuthError(err));
      })
      .finally(() => {
        if (!cancelled) setMfaSetupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, apiReady]);

  const applyError = (err: unknown) => {
    if (err instanceof AuthApiError) {
      setFieldErrors(err.fieldErrors);
      setError(formatAuthError(err));
      return;
    }
    setFieldErrors({});
    setError(formatAuthError(err));
  };

  const startBusy = () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    setSuccess(null);
  };

  let body: ReactNode = null;

  if (path === '/login') {
    body = (
      <form
        className="site-form auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!apiReady) {
            setError('Authentication API is not configured.');
            return;
          }
          const form = new FormData(event.currentTarget);
          const email = String(form.get('identity') ?? form.get('email') ?? '').trim();
          const password = String(form.get('password') ?? '');
          const remember = form.get('remember') === 'on';
          startBusy();
          try {
            const { user, meta } = await loginBrowserUser({ email, password, remember });
            setPendingAuthEmail(user.email);
            setDone(true);
            const returnTo =
              typeof window !== 'undefined'
                ? new URLSearchParams(window.location.search).get('returnTo')
                : null;
            const safeReturn =
              returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/account';
            if (meta.email_verification_required) {
              router.push('/verify-email');
            } else {
              router.push(safeReturn);
            }
          } catch (err) {
            applyError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <AuthTabs active="signin" />
        <h3>Sign In</h3>
        <p className="auth-copy">Sign in to continue your Family House journey.</p>
        {!apiReady ? <ApiConfigMissing /> : null}
        {error ? <AuthBanner tone="error">{error}</AuthBanner> : null}
        <div className="form-grid">
          {fields.map((field) => (
            <Field
              key={field.name}
              field={field.name === 'identity' ? { ...field, label: 'Email Address', type: 'email' } : field}
              defaultValue=""
              error={fieldErrors[field.name === 'identity' ? 'email' : field.name]?.[0]}
            />
          ))}
        </div>
        <div className="auth-meta">
          <label>
            <input type="checkbox" name="remember" /> Remember me
          </label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <button className="site-button wide-btn" type="submit" disabled={busy || !apiReady}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
        <p className="auth-switch">
          New here? <Link href="/register">Create your account</Link>
        </p>
      </form>
    );
  } else if (path.startsWith('/register')) {
    const draft = readRegisterDraft();
    body = (
      <div className="register-layout">
        <RegisterStepper path={path === '/register' ? '/register/personal' : path} />
        <form
          className="site-form auth-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);

            if (path === '/register') {
              router.push('/register/personal');
              return;
            }

            if (path.includes('/security')) {
              const password = String(form.get('password') ?? '');
              const confirm = String(form.get('confirm') ?? '');
              if (password !== confirm) {
                setFieldErrors({ confirm: ['Passwords do not match.'] });
                setError('Passwords do not match.');
                return;
              }
              if (password.length < 12) {
                setFieldErrors({ password: ['Password must be at least 12 characters.'] });
                setError('Password must be at least 12 characters.');
                return;
              }
            }

            const patch = draftFromFormData(form);
            const nextDraft = writeRegisterDraft(patch);

            if (!path.includes('/review')) {
              continueTo(router, path);
              return;
            }

            if (!apiReady) {
              setError('Authentication API is not configured.');
              return;
            }

            if (!isRegisterDraftComplete(nextDraft)) {
              setError('Missing required registration details. Go back and complete Personal, Contact, and Security.');
              return;
            }

            startBusy();
            try {
              const { user } = await registerBrowserUser({
                profile: {
                  given_name: nextDraft.given_name,
                  middle_name: nextDraft.middle_name || null,
                  family_name: nextDraft.family_name,
                  preferred_name: nextDraft.preferred_name || null,
                },
                email: nextDraft.email,
                password: nextDraft.password,
                password_confirmation: nextDraft.password_confirmation,
              });
              clearRegisterDraft();
              setPendingAuthEmail(user.email);
              setDone(true);
              router.push('/verify-email');
            } catch (err) {
              applyError(err);
            } finally {
              setBusy(false);
            }
          }}
          onInput={(event) => {
            const target = event.target as HTMLInputElement;
            if (target.name === 'password') setPasswordPreview(target.value);
          }}
        >
          <AuthTabs active="register" />
          <h3>{path === '/register' ? 'Create Your Account' : route.title}</h3>
          <p className="auth-copy">
            {path === '/register'
              ? 'Join Family House Connect in a few guided steps. We will verify your email before opening your dashboard.'
              : path.includes('/review')
                ? 'Confirm your details, then we will create your account and send an email verification link.'
                : 'Complete this step to create your member account.'}
          </p>
          {!apiReady && path.includes('/review') ? <ApiConfigMissing /> : null}
          {error ? <AuthBanner tone="error">{error}</AuthBanner> : null}
          {fields.length ? (
            <div className="form-grid">
              {fields.map((field) => {
                const draftKey =
                  field.name === 'firstName'
                    ? 'given_name'
                    : field.name === 'lastName'
                      ? 'family_name'
                      : field.name === 'confirm'
                        ? 'password_confirmation'
                        : field.name;
                const fromDraft = draft[draftKey as keyof typeof draft];
                return (
                  <Field
                    key={field.name}
                    field={field}
                    defaultValue={typeof fromDraft === 'string' ? fromDraft : ''}
                    error={
                      fieldErrors[field.name]?.[0] ??
                      fieldErrors[draftKey]?.[0] ??
                      (field.name === 'email' ? fieldErrors.email?.[0] : undefined)
                    }
                  />
                );
              })}
            </div>
          ) : null}
          {path.includes('/security') ? <PasswordRules password={passwordPreview || draft.password || ''} /> : null}
          {path.includes('/review') ? (
            <div className="choice-grid">
              <label>
                <input type="checkbox" name="terms" required /> I agree to the Family House Connect terms and privacy
                policy
              </label>
            </div>
          ) : null}
          <div className="form-actions">
            {path === '/register' ? (
              <Link className="site-button secondary" href="/login">
                Sign In instead
              </Link>
            ) : (
              <button type="button" className="site-button secondary" onClick={() => router.back()}>
                Back
              </button>
            )}
            <button className="site-button" type="submit" disabled={busy || (path.includes('/review') && !apiReady)}>
              {busy
                ? 'Creating account…'
                : done
                  ? 'Account created'
                  : path === '/register'
                    ? 'Start Registration'
                    : (route.action ?? 'Continue')}
            </button>
          </div>
          <p className="auth-switch">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </form>
      </div>
    );
  } else if (path === '/verify-email') {
    body = (
      <form
        className="site-form auth-form auth-center"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!apiReady) {
            setError('Authentication API is not configured.');
            return;
          }
          startBusy();
          try {
            const user = await fetchBrowserUser();
            if (!user.email_verified_at) {
              setError('Your email is not verified yet. Open the link from your email, then try again.');
              return;
            }
            clearPendingAuthEmail();
            setDone(true);
            router.push('/mfa/setup');
          } catch (err) {
            applyError(err);
            setError(
              formatAuthError(err) +
                ' Open the verification link from your email (or resend), then confirm here.',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="auth-icon">✉</div>
        <h3>Verify Your Email</h3>
        <p className="auth-copy">
          We requested a verification link for <b>{pendingEmail ?? 'your email address'}</b>. Delivery depends on
          Laravel mail being configured. After you open the signed link, confirm below — we check{' '}
          <code>GET /user/me</code> (no fake success).
        </p>
        {error ? <AuthBanner tone="error">{error}</AuthBanner> : null}
        {success ? <AuthBanner tone="success">{success}</AuthBanner> : null}
        {!apiReady ? <ApiConfigMissing /> : null}
        <button className="site-button wide-btn" type="submit" disabled={busy || !apiReady}>
          {busy ? 'Checking…' : 'I have verified my email'}
        </button>
        <div className="auth-meta center">
          <button
            type="button"
            className="linkish"
            disabled={seconds > 0 || busy || !apiReady}
            onClick={async () => {
              if (!apiReady) return;
              startBusy();
              try {
                await sendEmailVerificationNotification();
                setSuccess(
                  'Verification request accepted. If mail is configured, check your inbox for the signed link.',
                );
                setSeconds(60);
              } catch (err) {
                applyError(err);
              } finally {
                setBusy(false);
              }
            }}
          >
            {seconds > 0 ? `Resend Email in 00:${String(seconds).padStart(2, '0')}` : busy ? 'Sending…' : 'Resend Email'}
          </button>
          <Link href="/register/contact">Change email address</Link>
        </div>
      </form>
    );
  } else if (path === '/otp') {
    body = (
      <form
        className="site-form auth-form auth-center"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!apiReady) {
            setError('Authentication API is not configured.');
            return;
          }
          startBusy();
          try {
            if (otpMode === 'recovery') {
              const code = recoveryCode.trim();
              if (!code) {
                setError('Enter a one-time MFA recovery code from authenticator setup.');
                setBusy(false);
                return;
              }
              await challengeMfa({ recovery_code: code });
            } else {
              const code = otpDigits.join('');
              if (!/^\d{6}$/.test(code)) {
                setError('Enter the 6-digit authenticator code.');
                setBusy(false);
                return;
              }
              await challengeMfa({ code });
            }
            setDone(true);
            router.push('/onboarding/language');
          } catch (err) {
            applyError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="auth-icon">🔐</div>
        <h3>{otpMode === 'recovery' ? 'Enter MFA Recovery Code' : 'Enter Authenticator Code'}</h3>
        <p className="auth-copy">
          {otpMode === 'recovery'
            ? 'Use a single-use recovery code from MFA setup. This calls POST /auth/mfa/challenge — not email/SMS recovery.'
            : 'Enter the 6-digit code from your authenticator app to continue.'}
        </p>
        {!apiReady ? <ApiConfigMissing /> : null}
        {error ? <AuthBanner tone="error">{error}</AuthBanner> : null}
        {otpMode === 'recovery' ? (
          <label className="wide">
            Recovery code
            <input
              name="recovery_code"
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(event.target.value)}
              autoComplete="one-time-code"
              required
            />
          </label>
        ) : (
          <OtpInputs value={otpDigits} onChange={setOtpDigits} />
        )}
        <button className="site-button wide-btn" type="submit" disabled={busy || !apiReady}>
          {busy ? 'Verifying…' : 'Verify Code'}
        </button>
        <div className="auth-meta center">
          <button
            type="button"
            className="linkish"
            onClick={() => setOtpMode((mode) => (mode === 'totp' ? 'recovery' : 'totp'))}
          >
            {otpMode === 'recovery' ? 'Use authenticator code instead' : 'Use a recovery code instead'}
          </button>
          <Link href="/login">Back to Sign In</Link>
        </div>
      </form>
    );
  } else if (path === '/verify-phone') {
    body = (
      <div className="site-form auth-form auth-center">
        <div className="auth-icon">📱</div>
        <h3>Verify Your Phone</h3>
        <p className="auth-copy">
          Phone SMS verification is not available on the browser auth API yet. Continue with email verification and
          optional authenticator MFA.
        </p>
        <AuthBanner tone="info">Use email verification and authenticator MFA to secure your account.</AuthBanner>
        <div className="form-actions" style={{ justifyContent: 'center' }}>
          <Link className="site-button" href="/verify-email">
            Continue with email
          </Link>
        </div>
        <p className="auth-switch">
          <Link href="/login">Back to Sign In</Link>
        </p>
      </div>
    );
  } else if (path === '/forgot-password') {
    body = (
      <form
        className="site-form auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!apiReady) {
            setError('Authentication API is not configured.');
            return;
          }
          const form = new FormData(event.currentTarget);
          const email = String(form.get('identity') ?? form.get('email') ?? '').trim();
          startBusy();
          try {
            await requestPasswordReset(email);
            setDone(true);
            setSuccess(
              'If an account exists for that email, a reset was accepted. Delivery depends on Laravel mail being configured — this app does not claim the message was delivered.',
            );
          } catch (err) {
            applyError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>Forgot Password</h3>
        <p className="auth-copy">Enter the email on your account and we will send a reset link if it matches.</p>
        {!apiReady ? <ApiConfigMissing /> : null}
        {error ? <AuthBanner tone="error">{error}</AuthBanner> : null}
        {success ? <AuthBanner tone="success">{success}</AuthBanner> : null}
        <div className="form-grid">
          {fields.map((field) => (
            <Field
              key={field.name}
              field={{ ...field, label: 'Email Address', type: 'email', name: 'identity' }}
              defaultValue=""
              error={fieldErrors.email?.[0]}
            />
          ))}
        </div>
        <button className="site-button wide-btn" type="submit" disabled={busy || !apiReady || done}>
          {busy ? 'Sending…' : done ? 'Link sent' : 'Send Reset Link'}
        </button>
        <p className="auth-switch">
          <Link href="/account-recovery">More recovery options</Link> · <Link href="/login">Back to Sign In</Link>
        </p>
      </form>
    );
  } else if (path === '/reset-password') {
    body = (
      <form
        className="site-form auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!apiReady) {
            setError('Authentication API is not configured.');
            return;
          }
          const form = new FormData(event.currentTarget);
          const email = String(form.get('email') ?? resetEmail).trim();
          const tokenValue = String(form.get('token') ?? resetToken).trim();
          const password = String(form.get('password') ?? '');
          const passwordConfirmation = String(form.get('confirm') ?? form.get('password_confirmation') ?? '');
          if (!tokenValue) {
            setError('This reset link is missing a token. Open the link from your email.');
            return;
          }
          if (password !== passwordConfirmation) {
            setFieldErrors({ confirm: ['Passwords do not match.'] });
            setError('Passwords do not match.');
            return;
          }
          startBusy();
          try {
            await resetPassword({
              email,
              token: tokenValue,
              password,
              password_confirmation: passwordConfirmation,
            });
            setDone(true);
            setSuccess('Password updated. You can sign in with your new password.');
            window.setTimeout(() => router.push('/login'), 800);
          } catch (err) {
            applyError(err);
          } finally {
            setBusy(false);
          }
        }}
        onInput={(event) => {
          const target = event.target as HTMLInputElement;
          if (target.name === 'password') setPasswordPreview(target.value);
        }}
      >
        <h3>Reset Your Password</h3>
        <p className="auth-copy">Choose a strong password for your Family House account.</p>
        {!apiReady ? <ApiConfigMissing /> : null}
        {error ? <AuthBanner tone="error">{error}</AuthBanner> : null}
        {success ? <AuthBanner tone="success">{success}</AuthBanner> : null}
        <input type="hidden" name="token" value={resetToken} />
        <div className="form-grid">
          <label className="wide">
            Email Address
            <input name="email" type="email" defaultValue={resetEmail} required autoComplete="email" key={resetEmail || 'email'} />
            {fieldErrors.email?.[0] ? <span className="field-error">{fieldErrors.email[0]}</span> : null}
          </label>
          {fields.map((field) => (
            <Field
              key={field.name}
              field={field}
              defaultValue=""
              error={fieldErrors[field.name]?.[0] ?? fieldErrors.password?.[0]}
            />
          ))}
        </div>
        <PasswordRules password={passwordPreview} />
        <button className="site-button wide-btn" type="submit" disabled={busy || !apiReady || done}>
          {busy ? 'Updating…' : done ? 'Password updated' : 'Reset Password'}
        </button>
      </form>
    );
  } else if (path === '/mfa/setup') {
    body = (
      <form
        className="site-form auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!apiReady) {
            setError('Authentication API is not configured.');
            return;
          }
          if (!mfaEnrollment) {
            setError('Authenticator setup is not ready yet. Wait a moment and try again.');
            return;
          }
          const form = new FormData(event.currentTarget);
          const code = String(form.get('code') ?? '').replace(/\D/g, '');
          if (!/^\d{6}$/.test(code)) {
            setFieldErrors({ code: ['Enter the 6-digit authenticator code.'] });
            setError('Enter the 6-digit authenticator code.');
            return;
          }
          startBusy();
          try {
            await confirmMfaTotp({ method_id: mfaEnrollment.method_id, code });
            setDone(true);
            router.push('/onboarding/role');
          } catch (err) {
            applyError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>Set Up Two-Factor Authentication</h3>
        <p className="auth-copy">
          Add an authenticator app for an extra layer of protection. You can also skip and enable this later from
          Settings.
        </p>
        {!apiReady ? <ApiConfigMissing /> : null}
        {error ? <AuthBanner tone="error">{error}</AuthBanner> : null}
        <div className="mfa-methods">
          <button className="active" type="button">
            Authenticator App
            <small>Recommended</small>
          </button>
        </div>
        <div className="qr-panel">
          <div className="qr-box" aria-hidden="true">
            {mfaSetupLoading ? '…' : mfaEnrollment ? '✓' : '!'}
          </div>
          <div>
            <b>{mfaSetupLoading ? 'Preparing authenticator…' : 'Add this secret to your authenticator app'}</b>
            {mfaEnrollment ? (
              <>
                <p>
                  Secret: <code className="mfa-secret">{mfaEnrollment.secret}</code>
                </p>
                <p className="auth-copy">Then enter the 6-digit code below to enable MFA.</p>
                {mfaEnrollment.recovery_codes?.length ? (
                  <p className="auth-copy">
                    Save your recovery codes in a safe place. They will not be shown again.
                  </p>
                ) : null}
              </>
            ) : (
              <p>We will show your authenticator secret once setup is ready.</p>
            )}
          </div>
        </div>
        {mfaEnrollment?.recovery_codes?.length ? (
          <ul className="password-rules">
            {mfaEnrollment.recovery_codes.map((code) => (
              <li key={code}>
                <code>{code}</code>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="form-grid">
          {fields.map((field) => (
            <Field key={field.name} field={field} defaultValue="" error={fieldErrors.code?.[0]} />
          ))}
        </div>
        <div className="form-actions">
          <button type="button" className="site-button secondary" onClick={() => router.push('/onboarding/role')}>
            Maybe Later
          </button>
          <button className="site-button" type="submit" disabled={busy || !apiReady || !mfaEnrollment}>
            {busy ? 'Enabling…' : done ? 'Enabled' : 'Verify and Enable'}
          </button>
        </div>
      </form>
    );
  } else if (path === '/account-recovery') {
    body = (
      <div className="site-form auth-form">
        <h3>Account Recovery</h3>
        <p className="auth-copy">
          Only API-backed options are listed. There is no self-service “email me my MFA” or staff recovery endpoint in
          the browser auth API.
        </p>
        <div className="recovery-grid">
          {recoveryOptions.map(([title, bodyText, href]) => (
            <Link href={href} key={title}>
              <b>{title}</b>
              <small>{bodyText}</small>
            </Link>
          ))}
        </div>
        <AuthBanner tone="info">
          Lost all MFA recovery codes? That requires an operational support procedure — not available as a public API
          from this app.
        </AuthBanner>
        <p className="auth-switch">
          <Link href="/login">Back to Sign In</Link>
        </p>
      </div>
    );
  } else if (path === '/onboarding/language') {
    body = (
      <form
        className="site-form auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          continueTo(router, path);
        }}
      >
        <h3>Choose Your Language</h3>
        <p className="auth-copy">Pick the language you prefer for Family House Connect.</p>
        <div className="language-grid">
          {languages.map(([flag, label]) => (
            <button className={language === label ? 'active' : ''} key={label} type="button" onClick={() => setLanguage(label)}>
              <span>{flag}</span>
              {label}
            </button>
          ))}
        </div>
        <button className="site-button wide-btn" type="submit">
          Continue with {language}
        </button>
      </form>
    );
  } else if (path === '/onboarding/role') {
    body = (
      <form
        className="site-form auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          continueTo(router, path);
        }}
      >
        <h3>How will you use Family House?</h3>
        <p className="auth-copy">This helps us personalise your dashboard. You can change it later.</p>
        <div className="role-grid">
          {roles.map(([title, bodyText]) => (
            <button className={role === title ? 'active' : ''} key={title} type="button" onClick={() => setRole(title)}>
              <b>{title}</b>
              <small>{bodyText}</small>
            </button>
          ))}
        </div>
        <button className="site-button wide-btn" type="submit">
          Continue
        </button>
      </form>
    );
  } else {
    body = (
      <form
        className="site-form auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          continueTo(router, path);
        }}
      >
        <h3>{route.title}</h3>
        <p className="auth-copy">{route.subtitle}</p>
        {fields.length ? (
          <div className="form-grid">
            {fields.map((field) => (
              <Field key={field.name} field={field} defaultValue="" />
            ))}
          </div>
        ) : null}
        <div className="form-actions">
          <button type="button" className="site-button secondary" onClick={() => router.back()}>
            Back
          </button>
          <button className="site-button" type="submit">
            {route.action ?? 'Continue'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={`auth-shell ${path.startsWith('/register') ? 'register-shell' : ''}`}>
      <AuthBrand route={route} />
      {body}
    </div>
  );
}
