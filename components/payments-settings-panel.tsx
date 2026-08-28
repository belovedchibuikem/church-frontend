'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
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
  const [status, setStatus] = useState<PaymentProviderStatus>(emptyStatus);
  const [provider, setProvider] = useState<PaymentProviderId>('paystack');
  const [secret, setSecret] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [webhook, setWebhook] = useState('');
  const [message, setMessage] = useState(
    'Paste Paystack, Flutterwave, or Stripe keys, save, then activate. Web and mobile checkout stay off until activation.',
  );
  const [busy, setBusy] = useState(false);
  const fixtures = designFixturesEnabled();

  const refresh = useCallback(async () => {
    if (fixtures) {
      setMessage('Design fixtures enabled — payment configuration is not calling the live API.');
      return;
    }
    if (!platformApiConfigured()) {
      setMessage('Set NEXT_PUBLIC_FHC_API_URL to load live payment configuration.');
      return;
    }
    setBusy(true);
    try {
      const data = await getPaymentProvider();
      setStatus(data);
      if (data.active_provider) setProvider(data.active_provider);
      setMessage(
        data.active
          ? `Live provider: ${data.active_provider}. Giving on web and mobile uses hosted checkout.`
          : 'Keys are stored encrypted. Activate to enable checkout and signed webhooks.',
      );
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Could not reach the admin payments API. Requires platform.payments.* and recent MFA.'));
    } finally {
      setBusy(false);
    }
  }, [fixtures]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      setMessage(`Saved ${provider}. Click Activate so web and mobile checkout go live.`);
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Save failed. Confirm recent MFA and platform.payments.manage.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="platform-settings" onSubmit={onSave}>
      <article className="platform-card platform-settings-body">
        <header className="platform-settings-heading">
          <span className="platform-overline">PAYMENTS</span>
          <h2>Payment gateways</h2>
          <p>
            Superadmins delegate <code>platform.payments.manage</code>. Secrets are write-only and encrypted. Webhooks:
            <code> /api/v1/finance/webhooks/{provider}</code>
          </p>
        </header>
        <p className="maps-settings-lead" role="status">
          {message}
        </p>
        <div className="platform-form-grid">
          <label>
            <span>Active provider</span>
            <select value={provider} onChange={(event) => setProvider(event.target.value as PaymentProviderId)}>
              <option value="paystack">Paystack</option>
              <option value="flutterwave">Flutterwave</option>
              <option value="stripe">Stripe</option>
            </select>
          </label>
          <label>
            <span>Secret / secret key</span>
            <input autoComplete="off" onChange={(event) => setSecret(event.target.value)} type="password" value={secret} />
          </label>
          <label>
            <span>{provider === 'stripe' ? 'Publishable key' : 'Public key'}</span>
            <input autoComplete="off" onChange={(event) => setPublicKey(event.target.value)} type="password" value={publicKey} />
          </label>
          <label>
            <span>Webhook secret</span>
            <input autoComplete="off" onChange={(event) => setWebhook(event.target.value)} type="password" value={webhook} />
          </label>
        </div>
        <dl className="give-dl">
          <div>
            <dt>Paystack</dt>
            <dd>{status.providers.paystack.credentials_configured ? 'Keys saved' : 'Not configured'}</dd>
          </div>
          <div>
            <dt>Flutterwave</dt>
            <dd>{status.providers.flutterwave.credentials_configured ? 'Keys saved' : 'Not configured'}</dd>
          </div>
          <div>
            <dt>Stripe</dt>
            <dd>{status.providers.stripe.credentials_configured ? 'Keys saved' : 'Not configured'}</dd>
          </div>
        </dl>
        <footer className="form-footer">
          <button className="platform-primary" disabled={busy} type="submit">
            Save keys
          </button>
          <button className="ghost-button" disabled={busy} onClick={() => void activatePaymentProvider().then(setStatus)} type="button">
            Activate
          </button>
          <button className="ghost-button" disabled={busy} onClick={() => void deactivatePaymentProvider()} type="button">
            Deactivate
          </button>
        </footer>
      </article>
    </form>
  );
}
