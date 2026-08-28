'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import type { SiteRoute } from '@/lib/site-routes';
import {
  clearGivingDraft,
  emptyGivingDraft,
  GIVING_FUNDS,
  GIVING_PRESETS,
  parseGivingAmountMajor,
  readGivingDraft,
  readGivingReceiptSnapshot,
  writeGivingDraft,
  writeGivingReceiptSnapshot,
  type GivingDraft,
  type GivingReceiptSnapshot,
} from '@/lib/giving-flow';
import {
  completeGivingIntent,
  createGivingIntent,
  displayNameFromUser,
  fetchCurrentUser,
  fetchUserPaymentIntent,
  fetchUserPaymentReceipt,
  formatMoneyMinor,
  formatUserApiError,
  GIVING_CHECKOUT_UNAVAILABLE_MESSAGE,
  hostedCheckoutUrl,
  isLocalManualGivingProvider,
  isPaymentGovernanceDenied,
  isRecentMfaRequiredError,
  PAYMENT_GOVERNANCE_DENIED_MESSAGE,
  type CurrentUser,
  type UserPaymentReceipt,
} from '@/lib/user-api';

function formatWhen(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function useSignedInUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchCurrentUser()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, ready };
}

function GiveSignInGate({ returnTo }: { returnTo: string }) {
  return (
    <div className="give-shell">
      <section className="give-hero">
        <span className="eyebrow">GIVING</span>
        <h1>Give generously. Change lives.</h1>
        <p>Sign in to record a gift against your Family House account. Receipts and history stay with you.</p>
      </section>
      <div className="panel give-signin">
        <h3>Sign in to continue</h3>
        <p>Giving intents require a verified member session. After you sign in you will return to this page.</p>
        <div className="hero-actions">
          <Link className="site-button" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
            Sign In
          </Link>
          <Link className="site-button secondary" href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

function AmountChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const current = Number(value);
  return (
    <div className="give-presets" role="group" aria-label="Suggested amounts">
      {GIVING_PRESETS.map((amount) => (
        <button
          className={current === amount ? 'active' : ''}
          key={amount}
          onClick={() => onChange(String(amount))}
          type="button"
        >
          ₦{amount.toLocaleString()}
        </button>
      ))}
    </div>
  );
}

function GiveSummary({ draft, amountMinor }: { draft: GivingDraft; amountMinor: number | null }) {
  return (
    <aside className="give-aside panel">
      <span className="eyebrow">YOUR GIFT</span>
      <strong className="give-aside-amount">
        {amountMinor != null ? formatMoneyMinor(amountMinor, draft.currency) : 'Enter an amount'}
      </strong>
      <dl className="give-dl">
        <div>
          <dt>Fund</dt>
          <dd>{draft.fund}</dd>
        </div>
        <div>
          <dt>Method</dt>
          <dd>{draft.method}</dd>
        </div>
        <div>
          <dt>Currency</dt>
          <dd>{draft.currency}</dd>
        </div>
      </dl>
      {draft.note ? <p className="give-note">“{draft.note}”</p> : <p>Add a dedication if this gift is in honour of someone.</p>}
      <ul className="check-list">
        <li>Secure intent recorded to your account</li>
        <li>Receipt stored in My Giving</li>
        <li>Paystack, Flutterwave, or Stripe hosted checkout when activated</li>
      </ul>
    </aside>
  );
}

function GiveAmountStep({
  route,
  user,
  missionPreset,
}: {
  route: SiteRoute;
  user: CurrentUser | null;
  missionPreset: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<GivingDraft>(() => {
    const base = emptyGivingDraft();
    return missionPreset ? { ...base, fund: 'Mission Care Fund' } : base;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readGivingDraft();
    if (stored) setDraft(stored);
  }, []);
  const amountMajor = parseGivingAmountMajor(draft.amount);
  const amountMinor = amountMajor != null ? Math.round(amountMajor * 100) : null;
  const name = displayNameFromUser(user);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (amountMinor == null || amountMinor < 100) {
      setError('Enter an amount of at least ₦1.00.');
      return;
    }
    writeGivingDraft(draft);
    router.push('/give/payment');
  };

  return (
    <div className="give-shell">
      <section className="give-hero">
        <span className="eyebrow">GIVING</span>
        <h1>{route.path === '/mission/support' ? 'Support a mission' : 'Give generously, change lives'}</h1>
        <p>
          {name !== 'Member' ? `Thank you, ${name}. ` : ''}
          Every seed advances the Kingdom. Choose a fund, enter an amount, then confirm on the secure payment step.
        </p>
      </section>
      <div className="give-layout">
        <form className="site-form give-form" onSubmit={onSubmit}>
          <div className="form-intro">
            <h3>How would you like to give?</h3>
            <p>Your gift is saved on this device until you confirm payment. Nothing is charged on this step.</p>
          </div>
          <label className="wide">
            Give to
            <select
              name="fund"
              onChange={(event) => setDraft((prev) => ({ ...prev, fund: event.target.value }))}
              value={draft.fund}
            >
              {GIVING_FUNDS.map((fund) => (
                <option key={fund} value={fund}>
                  {fund}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            Amount (₦)
            <input
              inputMode="decimal"
              min="1"
              name="amount"
              onChange={(event) => setDraft((prev) => ({ ...prev, amount: event.target.value }))}
              placeholder="5000"
              step="1"
              type="number"
              value={draft.amount}
            />
          </label>
          <AmountChips
            value={draft.amount}
            onChange={(next) => setDraft((prev) => ({ ...prev, amount: next }))}
          />
          <label>
            Payment method
            <select
              name="method"
              onChange={(event) => setDraft((prev) => ({ ...prev, method: event.target.value }))}
              value={draft.method}
            >
              {['Card', 'Bank Transfer', 'USSD', 'Wallet'].map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <label>
            Currency
            <input name="currency" readOnly value="NGN" />
          </label>
          <label className="wide">
            Dedication / note
            <textarea
              name="note"
              onChange={(event) => setDraft((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="For Kingdom advancement…"
              rows={4}
              value={draft.note}
            />
          </label>
          {error ? (
            <p className="panel" data-giving-error="true" role="alert">
              {error}
            </p>
          ) : null}
          <div className="form-actions">
            <Link className="site-button secondary" href="/account/giving">
              Giving history
            </Link>
            <button className="site-button" type="submit">
              Continue to payment
            </button>
          </div>
        </form>
        <GiveSummary amountMinor={amountMinor} draft={draft} />
      </div>
    </div>
  );
}

function GivePaymentStep({ user }: { user: CurrentUser | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState<GivingDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const name = displayNameFromUser(user);

  useEffect(() => {
    setDraft(readGivingDraft());
  }, []);

  const amountMajor = draft ? parseGivingAmountMajor(draft.amount) : null;
  const amountMinor = amountMajor != null ? Math.round(amountMajor * 100) : null;

  const onPay = async () => {
    if (!draft || amountMinor == null) {
      setError('Start from the Give page so we know the amount to record.');
      return;
    }
    setBusy(true);
    setError(null);
    setMfaRequired(false);
    try {
      const intent = await createGivingIntent({
        amount_minor: amountMinor,
        currency: draft.currency,
        fund: draft.fund,
        note: draft.note || null,
      });
      const intentId = intent.id ?? intent.public_id ?? null;

      if (isLocalManualGivingProvider(intent.provider_code) && intentId) {
        const completed = await completeGivingIntent(intentId);
        const receiptId = completed.receipt?.id ?? completed.receipt?.public_id ?? null;
        let receiptNumber = completed.receipt?.receipt_number ?? null;
        let issuedAt = completed.receipt?.issued_at ?? completed.receipt?.created_at ?? null;
        if (receiptId) {
          try {
            const live = await fetchUserPaymentReceipt(receiptId);
            receiptNumber = live.receipt_number ?? receiptNumber;
            issuedAt = live.issued_at ?? live.created_at ?? issuedAt;
          } catch {
            /* snapshot still has amount */
          }
        }
        writeGivingReceiptSnapshot({
          receiptId,
          receiptNumber,
          intentId,
          amountMinor,
          currency: draft.currency,
          fund: draft.fund,
          note: draft.note,
          method: draft.method,
          issuedAt,
          status: completed.transaction?.status ?? completed.intent?.status ?? 'completed',
        });
        clearGivingDraft();
        setDone(true);
        const query = receiptId ? `?receipt=${encodeURIComponent(receiptId)}` : '';
        window.setTimeout(() => router.push(`/give/receipt${query}`), 400);
        return;
      }

      const checkoutUrl = hostedCheckoutUrl(intent);
      if (checkoutUrl && intentId) {
        writeGivingReceiptSnapshot({
          receiptId: null,
          receiptNumber: null,
          intentId,
          amountMinor,
          currency: draft.currency,
          fund: draft.fund,
          note: draft.note,
          method: draft.method,
          issuedAt: intent.created_at ?? null,
          status: intent.status ?? 'pending_provider',
        });
        window.location.assign(checkoutUrl);
        return;
      }

      writeGivingReceiptSnapshot({
        receiptId: null,
        receiptNumber: null,
        intentId,
        amountMinor,
        currency: draft.currency,
        fund: draft.fund,
        note: draft.note,
        method: draft.method,
        issuedAt: intent.created_at ?? null,
        status: intent.status ?? 'pending',
      });
      const payloadInstructions =
        intent.client_payload && typeof intent.client_payload.instructions === 'string'
          ? intent.client_payload.instructions
          : null;
      setError(payloadInstructions || GIVING_CHECKOUT_UNAVAILABLE_MESSAGE);
    } catch (err) {
      if (isRecentMfaRequiredError(err)) {
        setMfaRequired(true);
        setError(
          `${formatUserApiError(err, 'Recent verification is required to give.')} Complete MFA at /mfa/setup, then retry.`,
        );
      } else if (isPaymentGovernanceDenied(err)) {
        setError(formatUserApiError(err, PAYMENT_GOVERNANCE_DENIED_MESSAGE));
      } else {
        setError(formatUserApiError(err, 'Unable to start giving.'));
      }
    } finally {
      setBusy(false);
    }
  };

  if (!draft || amountMinor == null) {
    return (
      <div className="give-shell">
        <section className="give-hero">
          <span className="eyebrow">SECURE PAYMENT</span>
          <h1>Confirm your gift</h1>
          <p>We could not find an amount for this session. Start from the Give page.</p>
        </section>
        <Link className="site-button" href="/give">
          Start giving
        </Link>
      </div>
    );
  }

  return (
    <div className="give-shell">
      <section className="give-hero">
        <span className="eyebrow">SECURE PAYMENT</span>
        <h1>Confirm {formatMoneyMinor(amountMinor, draft.currency)}</h1>
        <p>
          {name !== 'Member' ? `${name}, ` : ''}review the details, then confirm. If a payment provider is active, you will continue to secure hosted checkout.
        </p>
      </section>
      <div className="give-layout">
        <section className="site-form give-form">
          <div className="form-intro">
            <h3>Payment confirmation</h3>
            <p>This creates a giving intent on your account, then opens Paystack, Flutterwave, or Stripe checkout when those keys are active.</p>
          </div>
          <dl className="give-dl give-dl-wide">
            <div>
              <dt>Amount</dt>
              <dd>{formatMoneyMinor(amountMinor, draft.currency)}</dd>
            </div>
            <div>
              <dt>Fund</dt>
              <dd>{draft.fund}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>{draft.method}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>{user?.email ?? 'Signed in'}</dd>
            </div>
          </dl>
          {draft.note ? <p className="give-note">Dedication: {draft.note}</p> : null}
          {error ? (
            <div className="panel" data-giving-error="true" role="alert">
              <p>{error}</p>
              {mfaRequired ? <Link className="site-button secondary" href="/mfa/setup">Set up MFA</Link> : null}
            </div>
          ) : null}
          <div className="form-actions">
            <Link className="site-button secondary" href="/give">
              Edit gift
            </Link>
            <button className="site-button" disabled={busy} onClick={() => void onPay()} type="button">
              {busy ? 'Processing…' : done ? 'Paid ✓' : `Pay ${formatMoneyMinor(amountMinor, draft.currency)}`}
            </button>
          </div>
        </section>
        <GiveSummary amountMinor={amountMinor} draft={draft} />
      </div>
    </div>
  );
}

export function GiveScreen({ route }: { route: SiteRoute }) {
  const { user, ready } = useSignedInUser();
  const missionPreset = route.path === '/mission/support';

  if (!ready) return <p className="panel">Preparing giving…</p>;
  if (!user) return <GiveSignInGate returnTo={route.path} />;
  if (route.path === '/give/payment') return <GivePaymentStep user={user} />;
  return <GiveAmountStep missionPreset={missionPreset} route={route} user={user} />;
}

export function GiveReceiptScreen({ route }: { route: SiteRoute }) {
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<UserPaymentReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GivingReceiptSnapshot | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);

  useEffect(() => {
    const snap = readGivingReceiptSnapshot();
    const query = new URLSearchParams(window.location.search);
    const queryId = query.get('receipt');
    const queryIntent = query.get('intent');
    setSnapshot(snap);
    setReceiptId(queryId ?? snap?.receiptId ?? null);
    setIntentId(queryIntent ?? snap?.intentId ?? null);
  }, []);

  useEffect(() => {
    if (receiptId || !intentId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const live = await fetchUserPaymentIntent(intentId);
        if (cancelled) return;
        if (live.status === 'succeeded') {
          setSnapshot((prev) =>
            prev ? { ...prev, status: 'succeeded', intentId } : prev,
          );
        }
      } catch {
        /* keep snapshot */
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [intentId, receiptId]);

  useEffect(() => {
    if (!receiptId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchUserPaymentReceipt(receiptId)
      .then((live) => {
        if (!cancelled) {
          setReceipt(live);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(formatUserApiError(err, 'Receipt could not be loaded from the server.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  const number = receipt?.receipt_number ?? snapshot?.receiptNumber ?? receiptId ?? 'Pending';
  const issued = receipt?.issued_at ?? receipt?.created_at ?? snapshot?.issuedAt ?? null;
  const amount = snapshot ? formatMoneyMinor(snapshot.amountMinor, snapshot.currency) : null;

  return (
    <div className="give-shell">
      <div className="success-card give-receipt">
        <span>✓</span>
        <h1>{route.title}</h1>
        <p>
          {amount ? `Your gift of ${amount}` : 'Your gift'}
          {snapshot?.fund ? ` to ${snapshot.fund}` : ''} has been recorded
          {issued ? ` on ${formatWhen(issued)}` : ''}.
        </p>
        {loading ? <p>Loading receipt from your account…</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <dl className="give-dl give-dl-wide">
          <div>
            <dt>Receipt</dt>
            <dd>{number}</dd>
          </div>
          {amount ? (
            <div>
              <dt>Amount</dt>
              <dd>{amount}</dd>
            </div>
          ) : null}
          {snapshot?.fund ? (
            <div>
              <dt>Fund</dt>
              <dd>{snapshot.fund}</dd>
            </div>
          ) : null}
          <div>
            <dt>Status</dt>
            <dd>{snapshot?.status ?? 'Recorded'}</dd>
          </div>
        </dl>
        {snapshot?.note ? <p className="give-note">“{snapshot.note}”</p> : null}
        <div className="hero-actions" style={{ justifyContent: 'center' }}>
          <Link className="site-button" href="/account/giving">
            {route.action ?? 'View giving history'}
          </Link>
          <Link className="site-button secondary" href="/give">
            Give again
          </Link>
        </div>
      </div>
    </div>
  );
}

export function GiveRecurringScreen({ route }: { route: SiteRoute }) {
  return (
    <div className="give-shell">
      <section className="give-hero">
        <span className="eyebrow">RECURRING GIVING</span>
        <h1>{route.title}</h1>
        <p>
          Scheduled subscriptions are not on the live payment API yet. You can still sow a one-time gift now — it is
          recorded against your account and appears in My Giving.
        </p>
      </section>
      <div className="panel">
        <h3>Give a one-time gift</h3>
        <p>Use the same secure intent flow. Recurring mandates will appear here when the provider is approved.</p>
        <div className="hero-actions">
          <Link className="site-button" href="/give">
            Give now
          </Link>
          <Link className="site-button secondary" href="/account/giving">
            View history
          </Link>
        </div>
      </div>
    </div>
  );
}
