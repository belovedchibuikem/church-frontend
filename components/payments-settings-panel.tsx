'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import {
  activatePaymentProvider,
  configurePaymentProvider,
  deactivatePaymentProvider,
  designFixturesEnabled,
  getPaymentProvider,
  platformApiConfigured,
  platformErrorMessage,
  type PaymentProviderId,
  type PaymentProviderStatus,
} from '../lib/admin-platform-api.ts';

const emptyStatus: PaymentProviderStatus = {
  configured: false,
  active: false,
  active_provider: 'paystack',
  providers: {
    paystack: { credentials_configured: false },
    flutterwave: { credentials_configured: false },
    stripe: { credentials_configured: false },
  },
  allowed_purpose_codes: ['giving', 'event_payment'],
  allowed_currencies: ['NGN'],
};

export function PaymentsSettingsPanel() {
  const { t } = useLocale();
  const [status, setStatus] = useState<PaymentProviderStatus>(emptyStatus);
  const [provider, setProvider] = useState<PaymentProviderId>('paystack');
  const [secret, setSecret] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [webhook, setWebhook] = useState('');
  const [message, setMessage] = useState(
    t('settings.payments.loadHint', {
      defaultMessage:
        'Paste Paystack, Flutterwave, or Stripe keys, save, then activate. Web and mobile checkout stay off until activation.',
    }),
  );
  const [busy, setBusy] = useState(false);
  const fixtures = designFixturesEnabled();

  const refresh = useCallback(async () => {
    if (fixtures) {
      setMessage(
        t('settings.payments.fixturesDisabled', {
          defaultMessage: 'Design fixtures enabled — payment configuration is not calling the live API.',
        }),
      );
      return;
    }
    if (!platformApiConfigured()) {
      setMessage(
        t('settings.payments.apiUrlRequired', {
          defaultMessage: 'Set NEXT_PUBLIC_FHC_API_URL to load live payment configuration.',
        }),
      );
      return;
    }
    setBusy(true);
    try {
      const data = await getPaymentProvider();
      setStatus(data);
      if (data.active_provider) setProvider(data.active_provider);
      setMessage(
        data.active
          ? t('settings.payments.liveProvider', {
              defaultMessage: 'Live provider: {provider}. Giving on web and mobile uses hosted checkout.',
              vars: { provider: data.active_provider },
            })
          : t('settings.payments.inactive', {
              defaultMessage: 'Keys are stored encrypted. Activate to enable checkout and signed webhooks.',
            }),
      );
    } catch (error) {
      setMessage(
        platformErrorMessage(
          error,
          t('errors.paymentsLoad', {
            defaultMessage: 'Could not reach the admin payments API. Requires platform.payments.* and recent MFA.',
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }, [fixtures, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onActivate() {
    if (fixtures || !platformApiConfigured()) return;
    setBusy(true);
    try {
      const data = await activatePaymentProvider();
      setStatus(data);
      setMessage(
        t('settings.payments.liveProvider', {
          defaultMessage: 'Live provider: {provider}. Giving on web and mobile uses hosted checkout.',
          vars: { provider: data.active_provider },
        }),
      );
    } catch (error) {
      setMessage(
        platformErrorMessage(
          error,
          t('errors.paymentsActivate', {
            defaultMessage: 'Activation failed. Confirm platform.payments.manage and recent MFA.',
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDeactivate() {
    if (fixtures || !platformApiConfigured()) return;
    setBusy(true);
    try {
      await deactivatePaymentProvider();
      await refresh();
    } catch (error) {
      setMessage(
        platformErrorMessage(
          error,
          t('errors.paymentsDeactivate', {
            defaultMessage: 'Deactivation failed. Confirm platform.payments.manage and recent MFA.',
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (fixtures || !platformApiConfigured()) return;
    setBusy(true);
    try {
      const body = {
        active_provider: provider,
        ...(provider === 'paystack' && secret ? { paystack_secret_key: secret } : {}),
        ...(provider === 'paystack' && publicKey ? { paystack_public_key: publicKey } : {}),
        ...(provider === 'paystack' && webhook ? { paystack_webhook_secret: webhook } : {}),
        ...(provider === 'flutterwave' && secret ? { flutterwave_secret_key: secret } : {}),
        ...(provider === 'flutterwave' && publicKey ? { flutterwave_public_key: publicKey } : {}),
        ...(provider === 'flutterwave' && webhook ? { flutterwave_webhook_secret: webhook } : {}),
        ...(provider === 'stripe' && secret ? { stripe_secret_key: secret } : {}),
        ...(provider === 'stripe' && publicKey ? { stripe_publishable_key: publicKey } : {}),
        ...(provider === 'stripe' && webhook ? { stripe_webhook_secret: webhook } : {}),
      };
      const data = await configurePaymentProvider(body);
      setStatus(data);
      setSecret('');
      setPublicKey('');
      setWebhook('');
      setMessage(
        t('settings.payments.saved', {
          defaultMessage: 'Saved {provider}. Click Activate so web and mobile checkout go live.',
          vars: { provider },
        }),
      );
    } catch (error) {
      setMessage(
        platformErrorMessage(
          error,
          t('errors.paymentsSave', {
            defaultMessage: 'Save failed. Confirm recent MFA and platform.payments.manage.',
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const keysSaved = t('settings.payments.keysSaved', { defaultMessage: 'Keys saved' });
  const notConfigured = t('settings.payments.notConfigured', { defaultMessage: 'Not configured' });

  return (
    <form className="platform-settings" onSubmit={onSave}>
      <article className="platform-card platform-settings-body">
        <header className="platform-settings-heading">
          <span className="platform-overline">{t('settings.payments.overline', { defaultMessage: 'PAYMENTS' })}</span>
          <h2>{t('settings.payments.title', { defaultMessage: 'Payment gateways' })}</h2>
          <p>
            {t('settings.payments.delegatedWith', { defaultMessage: 'Superadmins delegate' })}{' '}
            <code>platform.payments.manage</code>.{' '}
            {t('settings.payments.secretsWebhooks', {
              defaultMessage: 'Secrets are write-only and encrypted. Webhooks:',
            })}
            <code> /api/v1/finance/webhooks/{provider}</code>
          </p>
        </header>
        <p className="maps-settings-lead" role="status">
          {message}
        </p>
        <div className="platform-form-grid">
          <label>
            <span>{t('settings.payments.activeProvider', { defaultMessage: 'Active provider' })}</span>
            <select value={provider} onChange={(event) => setProvider(event.target.value as PaymentProviderId)}>
              <option value="paystack">{t('settings.payments.paystack', { defaultMessage: 'Paystack' })}</option>
              <option value="flutterwave">{t('settings.payments.flutterwave', { defaultMessage: 'Flutterwave' })}</option>
              <option value="stripe">{t('settings.payments.stripe', { defaultMessage: 'Stripe' })}</option>
            </select>
          </label>
          <label>
            <span>{t('settings.payments.secretKey', { defaultMessage: 'Secret / secret key' })}</span>
            <input autoComplete="off" onChange={(event) => setSecret(event.target.value)} type="password" value={secret} />
          </label>
          <label>
            <span>
              {provider === 'stripe'
                ? t('settings.payments.publishableKey', { defaultMessage: 'Publishable key' })
                : t('settings.payments.publicKey', { defaultMessage: 'Public key' })}
            </span>
            <input autoComplete="off" onChange={(event) => setPublicKey(event.target.value)} type="password" value={publicKey} />
          </label>
          <label>
            <span>{t('settings.payments.webhookSecret', { defaultMessage: 'Webhook secret' })}</span>
            <input autoComplete="off" onChange={(event) => setWebhook(event.target.value)} type="password" value={webhook} />
          </label>
        </div>
        <dl className="give-dl">
          <div>
            <dt>{t('settings.payments.paystack', { defaultMessage: 'Paystack' })}</dt>
            <dd>{status.providers.paystack.credentials_configured ? keysSaved : notConfigured}</dd>
          </div>
          <div>
            <dt>{t('settings.payments.flutterwave', { defaultMessage: 'Flutterwave' })}</dt>
            <dd>{status.providers.flutterwave.credentials_configured ? keysSaved : notConfigured}</dd>
          </div>
          <div>
            <dt>{t('settings.payments.stripe', { defaultMessage: 'Stripe' })}</dt>
            <dd>{status.providers.stripe.credentials_configured ? keysSaved : notConfigured}</dd>
          </div>
        </dl>
        <footer className="form-footer">
          <button className="platform-primary" disabled={busy} type="submit">
            {t('settings.payments.saveKeys', { defaultMessage: 'Save keys' })}
          </button>
          <button className="ghost-button" disabled={busy} onClick={() => void onActivate()} type="button">
            {t('common.activate', { defaultMessage: 'Activate' })}
          </button>
          <button className="ghost-button" disabled={busy} onClick={() => void onDeactivate()} type="button">
            {t('common.deactivate', { defaultMessage: 'Deactivate' })}
          </button>
        </footer>
      </article>
    </form>
  );
}
