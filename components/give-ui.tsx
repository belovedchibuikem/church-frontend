'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useLocale } from '@/components/locale-provider';
import type { TranslateOptions } from '@/lib/i18n/types.ts';
import type { SiteRoute } from '@/lib/site-routes';
import {
  clearGivingDraft,
  emptyGivingDraft,
  GIVING_FUNDS,
  GIVING_PRESETS,
  givingFundToPurpose,
  isManualGivingMethod,
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
  storeUserFile,
  type CurrentUser,
  type UserPaymentReceipt,
} from '@/lib/user-api';

type TranslateFn = (key: string, options?: TranslateOptions) => string;

const GIVING_METHODS = ['Card', 'Bank Transfer', 'USSD', 'Wallet'] as const;

function formatWhen(value?: string | null, locale?: string): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function givingFundLabel(t: TranslateFn, fund: string): string {
  const keys: Record<string, string> = {
    Tithe: 'account.givingFundTithe',
    Offering: 'account.givingFundOffering',
    'General Offering': 'account.givingFundOffering',
    'Mission Care Fund': 'account.givingFundMissionCare',
    'Building Hope Church': 'account.givingFundBuildingHope',
    'KCA Scholarship': 'account.givingFundKcaScholarship',
  };
  return t(keys[fund] ?? 'account.givingFund', { defaultMessage: fund });
}

function givingMethodLabel(t: TranslateFn, method: string): string {
  const keys: Record<string, string> = {
    Card: 'account.givingMethodCard',
    'Bank Transfer': 'account.givingMethodBankTransfer',
    USSD: 'account.givingMethodUssd',
    Wallet: 'account.givingMethodWallet',
  };
  return t(keys[method] ?? 'account.givingMethod', { defaultMessage: method });
}

function givingStatusLabel(t: TranslateFn, status: string): string {
  const keys: Record<string, string> = {
    completed: 'account.givingStatusCompleted',
    succeeded: 'account.givingStatusSucceeded',
    pending: 'account.givingStatusPending',
    pending_provider: 'account.givingStatusPendingProvider',
    Recorded: 'account.givingStatusRecorded',
    Pending: 'account.givingStatusPendingFallback',
  };
  return t(keys[status] ?? 'account.givingStatus', { defaultMessage: status });
}

function useSignedInUser() {
  const { user, ready } = useAuth();
  return { user, ready };
}

function GiveSignInGate({ returnTo }: { returnTo: string }) {
  const { t } = useLocale();
  return (
    <div className="give-shell">
      <section className="give-hero">
        <span className="eyebrow">{t('account.givingEyebrow', { defaultMessage: 'GIVING' })}</span>
        <h1>{t('account.giveHeadline', { defaultMessage: 'Give generously. Change lives.' })}</h1>
        <p>
          {t('account.giveSignInCopy', {
            defaultMessage: 'Sign in to record a gift against your Family House account. Receipts and history stay with you.',
          })}
        </p>
      </section>
      <div className="panel give-signin">
        <h3>{t('account.signInToContinue', { defaultMessage: 'Sign in to continue' })}</h3>
        <p>
          {t('account.givingRequiresSession', {
            defaultMessage:
              'Giving intents require a verified member session. After you sign in you will return to this page.',
          })}
        </p>
        <div className="hero-actions">
          <Link className="site-button" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
            {t('common.signIn', { defaultMessage: 'Sign In' })}
          </Link>
          <Link className="site-button secondary" href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>
            {t('account.createAccount', { defaultMessage: 'Create Account' })}
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
  const { t, locale } = useLocale();
  const current = Number(value);
  return (
    <div className="give-presets" role="group" aria-label={t('account.suggestedAmounts', { defaultMessage: 'Suggested amounts' })}>
      {GIVING_PRESETS.map((amount) => (
        <button
          className={current === amount ? 'active' : ''}
          key={amount}
          onClick={() => onChange(String(amount))}
          type="button"
        >
          ₦{amount.toLocaleString(locale)}
        </button>
      ))}
    </div>
  );
}

function GiveSummary({ draft, amountMinor }: { draft: GivingDraft; amountMinor: number | null }) {
  const { t } = useLocale();
  return (
    <aside className="give-aside panel">
      <span className="eyebrow">{t('account.yourGiftEyebrow', { defaultMessage: 'YOUR GIFT' })}</span>
      <strong className="give-aside-amount">
        {amountMinor != null
          ? formatMoneyMinor(amountMinor, draft.currency)
          : t('account.enterAnAmount', { defaultMessage: 'Enter an amount' })}
      </strong>
      <dl className="give-dl">
        <div>
          <dt>{t('account.fund', { defaultMessage: 'Fund' })}</dt>
          <dd>{givingFundLabel(t, draft.fund)}</dd>
        </div>
        <div>
          <dt>{t('account.method', { defaultMessage: 'Method' })}</dt>
          <dd>{givingMethodLabel(t, draft.method)}</dd>
        </div>
        <div>
          <dt>{t('account.currency', { defaultMessage: 'Currency' })}</dt>
          <dd>{draft.currency}</dd>
        </div>
      </dl>
      {draft.note ? (
        <p className="give-note">“{draft.note}”</p>
      ) : (
        <p>
          {t('account.addDedication', {
            defaultMessage: 'Add a dedication if this gift is in honour of someone.',
          })}
        </p>
      )}
      <ul className="check-list">
        <li>{t('account.secureIntentRecorded', { defaultMessage: 'Secure intent recorded to your account' })}</li>
        <li>{t('account.receiptStored', { defaultMessage: 'Receipt stored in My Giving' })}</li>
        <li>
          {t('account.hostedCheckoutWhenActivated', {
            defaultMessage: 'Paystack, Flutterwave, or Stripe hosted checkout when activated',
          })}
        </li>
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
  const { t } = useLocale();
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
      setError(t('errors.enterMinimumGivingAmount', { defaultMessage: 'Enter an amount of at least ₦1.00.' }));
      return;
    }
    writeGivingDraft(draft);
    router.push('/give/payment');
  };

  return (
    <div className="give-shell">
      <section className="give-hero">
        <span className="eyebrow">{t('account.givingEyebrow', { defaultMessage: 'GIVING' })}</span>
        <h1>
          {route.path === '/mission/support'
            ? t('account.supportAMission', { defaultMessage: 'Support a mission' })
            : t('account.giveGenerouslyChangeLives', { defaultMessage: 'Give generously, change lives' })}
        </h1>
        <p>
          {name !== 'Member'
            ? t('account.thankYouName', { defaultMessage: 'Thank you, {name}. ', vars: { name } })
            : ''}
          {t('account.giveAmountCopy', {
            defaultMessage:
              'Every seed advances the Kingdom. Choose a fund, enter an amount, then confirm on the secure payment step.',
          })}
        </p>
      </section>
      <div className="give-layout">
        <form className="site-form give-form" onSubmit={onSubmit}>
          <div className="form-intro">
            <h3>{t('account.howWouldYouLikeToGive', { defaultMessage: 'How would you like to give?' })}</h3>
            <p>
              {t('account.giftSavedOnDevice', {
                defaultMessage: 'Your gift is saved on this device until you confirm payment. Nothing is charged on this step.',
              })}
            </p>
          </div>
          <label className="wide">
            {t('account.giveTo', { defaultMessage: 'Give to' })}
            <select
              name="fund"
              onChange={(event) => setDraft((prev) => ({ ...prev, fund: event.target.value }))}
              value={draft.fund}
            >
              {GIVING_FUNDS.map((fund) => (
                <option key={fund} value={fund}>
                  {givingFundLabel(t, fund)}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            {t('account.amountNaira', { defaultMessage: 'Amount (₦)' })}
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
            {t('account.paymentMethod', { defaultMessage: 'Payment method' })}
            <select
              name="method"
              onChange={(event) => setDraft((prev) => ({ ...prev, method: event.target.value }))}
              value={draft.method}
            >
              {GIVING_METHODS.map((method) => (
                <option key={method} value={method}>
                  {givingMethodLabel(t, method)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('account.currency', { defaultMessage: 'Currency' })}
            <input name="currency" readOnly value="NGN" />
          </label>
          <label className="wide">
            {t('account.dedicationNote', { defaultMessage: 'Dedication / note' })}
            <textarea
              name="note"
              onChange={(event) => setDraft((prev) => ({ ...prev, note: event.target.value }))}
              placeholder={t('account.dedicationPlaceholder', { defaultMessage: 'For Kingdom advancement…' })}
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
              {t('account.givingHistory', { defaultMessage: 'Giving history' })}
            </Link>
            <button className="site-button" type="submit">
              {t('account.continueToPayment', { defaultMessage: 'Continue to payment' })}
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
  const { t } = useLocale();
  const [draft, setDraft] = useState<GivingDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [requireProof, setRequireProof] = useState(false);
  const name = displayNameFromUser(user);

  useEffect(() => {
    setDraft(readGivingDraft());
  }, []);

  const amountMajor = draft ? parseGivingAmountMajor(draft.amount) : null;
  const amountMinor = amountMajor != null ? Math.round(amountMajor * 100) : null;

  const onPay = async () => {
    if (!draft || amountMinor == null) {
      setError(
        t('errors.startFromGivePage', {
          defaultMessage: 'Start from the Give page so we know the amount to record.',
        }),
      );
      return;
    }
    setBusy(true);
    setError(null);
    setMfaRequired(false);
    try {
      const needsProof = isManualGivingMethod(draft.method) || requireProof;
      let proofId: string | undefined;
      if (needsProof) {
        if (!proofFile) {
          setError(
            t('account.uploadPaymentReceiptRequired', {
              defaultMessage: 'Upload a photo or PDF of your payment receipt before recording this gift.',
            }),
          );
          setBusy(false);
          return;
        }
        const formData = new FormData();
        formData.set('file', proofFile);
        formData.set('purpose', 'payment.proof');
        formData.set('classification', 'internal');
        const asset = await storeUserFile(formData);
        proofId = asset.id ?? asset.public_id ?? undefined;
        if (!proofId) {
          setError(t('errors.uploadReceiptFailed', { defaultMessage: 'The payment receipt could not be stored. Try again.' }));
          setBusy(false);
          return;
        }
      }

      const intent = await createGivingIntent({
        amount_minor: amountMinor,
        currency: draft.currency,
        fund: draft.fund,
        purpose_code: givingFundToPurpose(draft.fund),
        note: draft.note || null,
        proof_file_asset_id: proofId,
      });
      const intentId = intent.id ?? intent.public_id ?? null;

      if (isLocalManualGivingProvider(intent.provider_code) && intentId) {
        if (!proofId) {
          setRequireProof(true);
          setError(
            t('account.uploadPaymentReceiptRequired', {
              defaultMessage: 'Upload a photo or PDF of your payment receipt before recording this gift.',
            }),
          );
          setBusy(false);
          return;
        }
        const completed = await completeGivingIntent(intentId, proofId);
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
      setError(
        payloadInstructions ||
          t('errors.givingCheckoutUnavailable', { defaultMessage: GIVING_CHECKOUT_UNAVAILABLE_MESSAGE }),
      );
    } catch (err) {
      if (isRecentMfaRequiredError(err)) {
        setMfaRequired(true);
        setError(
          `${formatUserApiError(
            err,
            t('errors.recentMfaRequiredToGive', { defaultMessage: 'Recent verification is required to give.' }),
          )} ${t('errors.completeMfaThenRetry', { defaultMessage: 'Complete MFA at /mfa/setup, then retry.' })}`,
        );
      } else if (isPaymentGovernanceDenied(err)) {
        setError(
          formatUserApiError(
            err,
            t('errors.paymentGovernanceDenied', { defaultMessage: PAYMENT_GOVERNANCE_DENIED_MESSAGE }),
          ),
        );
      } else {
        setError(formatUserApiError(err, t('errors.unableToStartGiving', { defaultMessage: 'Unable to start giving.' })));
      }
    } finally {
      setBusy(false);
    }
  };

  if (!draft || amountMinor == null) {
    return (
      <div className="give-shell">
        <section className="give-hero">
          <span className="eyebrow">{t('account.securePaymentEyebrow', { defaultMessage: 'SECURE PAYMENT' })}</span>
          <h1>{t('account.confirmYourGift', { defaultMessage: 'Confirm your gift' })}</h1>
          <p>
            {t('account.couldNotFindAmount', {
              defaultMessage: 'We could not find an amount for this session. Start from the Give page.',
            })}
          </p>
        </section>
        <Link className="site-button" href="/give">
          {t('account.startGiving', { defaultMessage: 'Start giving' })}
        </Link>
      </div>
    );
  }

  const formattedAmount = formatMoneyMinor(amountMinor, draft.currency);

  return (
    <div className="give-shell">
      <section className="give-hero">
        <span className="eyebrow">{t('account.securePaymentEyebrow', { defaultMessage: 'SECURE PAYMENT' })}</span>
        <h1>
          {t('account.confirmAmount', {
            defaultMessage: 'Confirm {amount}',
            vars: { amount: formattedAmount },
          })}
        </h1>
        <p>
          {name !== 'Member' ? t('account.reviewNamePrefix', { defaultMessage: '{name}, ', vars: { name } }) : ''}
          {t('account.reviewThenConfirm', {
            defaultMessage:
              'review the details, then confirm. If a payment provider is active, you will continue to secure hosted checkout.',
          })}
        </p>
      </section>
      <div className="give-layout">
        <section className="site-form give-form">
          <div className="form-intro">
            <h3>{t('account.paymentConfirmation', { defaultMessage: 'Payment confirmation' })}</h3>
            <p>
              {t('account.paymentConfirmationCopy', {
                defaultMessage:
                  'This creates a giving intent on your account, then opens Paystack, Flutterwave, or Stripe checkout when those keys are active.',
              })}
            </p>
          </div>
          <dl className="give-dl give-dl-wide">
            <div>
              <dt>{t('account.amount', { defaultMessage: 'Amount' })}</dt>
              <dd>{formattedAmount}</dd>
            </div>
            <div>
              <dt>{t('account.fund', { defaultMessage: 'Fund' })}</dt>
              <dd>{givingFundLabel(t, draft.fund)}</dd>
            </div>
            <div>
              <dt>{t('account.method', { defaultMessage: 'Method' })}</dt>
              <dd>{givingMethodLabel(t, draft.method)}</dd>
            </div>
            <div>
              <dt>{t('account.account', { defaultMessage: 'Account' })}</dt>
              <dd>{user?.email ?? t('account.signedIn', { defaultMessage: 'Signed in' })}</dd>
            </div>
          </dl>
          {draft.note ? (
            <p className="give-note">
              {t('account.dedicationWithNote', {
                defaultMessage: 'Dedication: {note}',
                vars: { note: draft.note },
              })}
            </p>
          ) : null}
          {(isManualGivingMethod(draft.method) || requireProof) ? (
            <label className="wide">
              {t('account.paymentReceipt', { defaultMessage: 'Payment receipt' })}
              <input
                accept="image/*,application/pdf"
                onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <small>
                {t('account.paymentReceiptHint', {
                  defaultMessage: 'Required for bank transfer, USSD, wallet, or other manual payment. Tithe and Offering are recorded as separate gifts.',
                })}
              </small>
            </label>
          ) : null}
          {error ? (
            <div className="panel" data-giving-error="true" role="alert">
              <p>{error}</p>
              {mfaRequired ? (
                <Link className="site-button secondary" href="/mfa/setup">
                  {t('account.setupMfa', { defaultMessage: 'Set up MFA' })}
                </Link>
              ) : null}
            </div>
          ) : null}
          <div className="form-actions">
            <Link className="site-button secondary" href="/give">
              {t('account.editGift', { defaultMessage: 'Edit gift' })}
            </Link>
            <button className="site-button" disabled={busy} onClick={() => void onPay()} type="button">
              {busy
                ? t('common.processing', { defaultMessage: 'Processing…' })
                : done
                  ? t('account.paid', { defaultMessage: 'Paid ✓' })
                  : t('account.payAmount', { defaultMessage: 'Pay {amount}', vars: { amount: formattedAmount } })}
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
  const { t } = useLocale();
  const missionPreset = route.path === '/mission/support';

  if (!ready) return <p className="panel">{t('account.preparingGiving', { defaultMessage: 'Preparing giving…' })}</p>;
  if (!user) return <GiveSignInGate returnTo={route.path} />;
  if (route.path === '/give/payment') return <GivePaymentStep user={user} />;
  return <GiveAmountStep missionPreset={missionPreset} route={route} user={user} />;
}

export function GiveReceiptScreen({ route }: { route: SiteRoute }) {
  const { t, locale } = useLocale();
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
        if (!cancelled) {
          setError(
            formatUserApiError(
              err,
              t('errors.receiptCouldNotBeLoaded', {
                defaultMessage: 'Receipt could not be loaded from the server.',
              }),
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [receiptId, t]);

  const pendingLabel = t('account.pending', { defaultMessage: 'Pending' });
  const number = receipt?.receipt_number ?? snapshot?.receiptNumber ?? receiptId ?? pendingLabel;
  const issued = receipt?.issued_at ?? receipt?.created_at ?? snapshot?.issuedAt ?? null;
  const amount = snapshot ? formatMoneyMinor(snapshot.amountMinor, snapshot.currency) : null;
  const fundLabel = snapshot?.fund ? givingFundLabel(t, snapshot.fund) : '';

  return (
    <div className="give-shell">
      <div className="success-card give-receipt">
        <span>✓</span>
        <h1>{t('account.givingReceiptTitle', { defaultMessage: route.title })}</h1>
        <p>
          {amount
            ? t('account.yourGiftOfAmount', { defaultMessage: 'Your gift of {amount}', vars: { amount } })
            : t('account.yourGiftPlain', { defaultMessage: 'Your gift' })}
          {snapshot?.fund
            ? t('account.toFundPart', { defaultMessage: ' to {fund}', vars: { fund: fundLabel } })
            : ''}{' '}
          {t('account.hasBeenRecorded', { defaultMessage: 'has been recorded' })}
          {issued
            ? t('account.recordedOnPart', {
                defaultMessage: ' on {when}',
                vars: { when: formatWhen(issued, locale) },
              })
            : ''}
          .
        </p>
        {loading ? <p>{t('account.loadingReceipt', { defaultMessage: 'Loading receipt from your account…' })}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <dl className="give-dl give-dl-wide">
          <div>
            <dt>{t('account.receipt', { defaultMessage: 'Receipt' })}</dt>
            <dd>{number}</dd>
          </div>
          {amount ? (
            <div>
              <dt>{t('account.amount', { defaultMessage: 'Amount' })}</dt>
              <dd>{amount}</dd>
            </div>
          ) : null}
          {snapshot?.fund ? (
            <div>
              <dt>{t('account.fund', { defaultMessage: 'Fund' })}</dt>
              <dd>{fundLabel}</dd>
            </div>
          ) : null}
          <div>
            <dt>{t('account.status', { defaultMessage: 'Status' })}</dt>
            <dd>
              {snapshot?.status
                ? givingStatusLabel(t, snapshot.status)
                : t('account.recorded', { defaultMessage: 'Recorded' })}
            </dd>
          </div>
        </dl>
        {snapshot?.note ? <p className="give-note">“{snapshot.note}”</p> : null}
        <div className="hero-actions" style={{ justifyContent: 'center' }}>
          <Link className="site-button" href="/account/giving">
            {t('account.viewGivingHistory', { defaultMessage: route.action ?? 'View giving history' })}
          </Link>
          <Link className="site-button secondary" href="/give">
            {t('account.giveAgain', { defaultMessage: 'Give again' })}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function GiveRecurringScreen({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  return (
    <div className="give-shell">
      <section className="give-hero">
        <span className="eyebrow">{t('account.recurringGivingEyebrow', { defaultMessage: 'RECURRING GIVING' })}</span>
        <h1>{t('account.recurringGivingTitle', { defaultMessage: route.title })}</h1>
        <p>
          {t('account.recurringNotLive', {
            defaultMessage:
              'Scheduled subscriptions are not on the live payment API yet. You can still sow a one-time gift now — it is recorded against your account and appears in My Giving.',
          })}
        </p>
      </section>
      <div className="panel">
        <h3>{t('account.giveAOneTimeGift', { defaultMessage: 'Give a one-time gift' })}</h3>
        <p>
          {t('account.recurringOneTimeCopy', {
            defaultMessage:
              'Use the same secure intent flow. Recurring mandates will appear here when the provider is approved.',
          })}
        </p>
        <div className="hero-actions">
          <Link className="site-button" href="/give">
            {t('account.giveNow', { defaultMessage: 'Give now' })}
          </Link>
          <Link className="site-button secondary" href="/account/giving">
            {t('account.viewHistory', { defaultMessage: 'View history' })}
          </Link>
        </div>
      </div>
    </div>
  );
}
