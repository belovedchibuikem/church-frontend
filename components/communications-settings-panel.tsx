'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  activateCommunicationProvider,
  configureCommunicationProvider,
  deactivateCommunicationProvider,
  designFixturesEnabled,
  getCommunicationProvider,
  platformApiConfigured,
  platformErrorMessage,
  type CommunicationProviderStatus,
} from '../lib/admin-platform-api.ts';

const emptyStatus: CommunicationProviderStatus = {
  configured: false,
  active: false,
  email: { provider: 'none', credentials_configured: false },
  sms: { provider: 'none', credentials_configured: false },
  whatsapp: { provider: 'none', credentials_configured: false },
  push: { provider: 'none', credentials_configured: false },
  consent_required_channels: ['email', 'sms', 'whatsapp', 'push'],
  retry: { max_attempts: 3, backoff_seconds: 60 },
};

export function CommunicationsSettingsPanel() {
  const [status, setStatus] = useState<CommunicationProviderStatus>(emptyStatus);
  const [message, setMessage] = useState('Load live communication providers, sender identities, consent, and retry policy.');
  const [busy, setBusy] = useState(false);
  const fixtures = designFixturesEnabled();

  const refresh = useCallback(async () => {
    if (fixtures || !platformApiConfigured()) {
      setMessage(fixtures ? 'Design fixtures enabled — live communication settings are disabled.' : 'Set NEXT_PUBLIC_FHC_API_URL to load providers.');
      return;
    }
    setBusy(true);
    try {
      const data = await getCommunicationProvider();
      setStatus(data);
      setMessage(data.active ? 'Communication providers are active for governed deliveries.' : 'Save credentials, then activate. Unconfigured channels stay suppressed.');
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Could not load communication providers. Requires platform.communications.* and recent MFA.'));
    } finally {
      setBusy(false);
    }
  }, [fixtures]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fixtures || !platformApiConfigured()) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        email_provider: String(form.get('email_provider') || 'none'),
        email_sender_name: String(form.get('email_sender_name') || ''),
        email_sender_address: String(form.get('email_sender_address') || ''),
        sms_provider: String(form.get('sms_provider') || 'none'),
        sms_sender_id: String(form.get('sms_sender_id') || ''),
        whatsapp_provider: String(form.get('whatsapp_provider') || 'none'),
        whatsapp_phone_number_id: String(form.get('whatsapp_phone_number_id') || ''),
        push_provider: String(form.get('push_provider') || 'none'),
        retry_max_attempts: Number(form.get('retry_max_attempts') || 3),
        retry_backoff_seconds: Number(form.get('retry_backoff_seconds') || 60),
        consent_required_channels: ['email', 'sms', 'whatsapp', 'push'],
      };
      const emailKey = String(form.get('email_api_key') || '').trim();
      const smsKey = String(form.get('sms_api_key') || '').trim();
      const waToken = String(form.get('whatsapp_access_token') || '').trim();
      const pushKey = String(form.get('push_server_key') || '').trim();
      if (emailKey) body.email_api_key = emailKey;
      if (smsKey) body.sms_api_key = smsKey;
      if (waToken) body.whatsapp_access_token = waToken;
      if (pushKey) body.push_server_key = pushKey;
      const data = await configureCommunicationProvider(body);
      setStatus(data);
      event.currentTarget.reset();
      setMessage('Saved. Activate to send on configured channels.');
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Save failed. Confirm platform.communications.manage and recent MFA.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="platform-settings" onSubmit={onSave}>
      <article className="platform-card platform-settings-body">
        <header className="platform-settings-heading">
          <span className="platform-overline">COMMUNICATIONS</span>
          <h2>Providers, consent, and delivery policy</h2>
          <p>Delegated with <code>platform.communications.manage</code>. Secrets are write-only. Audience consent still applies before delivery.</p>
        </header>
        <p className="maps-settings-lead" role="status">
          {message}
        </p>
        <div className="platform-form-grid">
          <label>
            <span>Email provider</span>
            <select defaultValue={status.email.provider} name="email_provider">
              <option value="none">None</option>
              <option value="resend">Resend</option>
              <option value="ses">Amazon SES</option>
              <option value="mailgun">Mailgun</option>
              <option value="smtp">SMTP</option>
            </select>
          </label>
          <label>
            <span>From name</span>
            <input defaultValue={status.email.sender_name ?? ''} name="email_sender_name" />
          </label>
          <label>
            <span>From address</span>
            <input defaultValue={status.email.sender_address ?? ''} name="email_sender_address" type="email" />
          </label>
          <label>
            <span>Email API key</span>
            <input autoComplete="off" name="email_api_key" type="password" />
          </label>
          <label>
            <span>SMS provider</span>
            <select defaultValue={status.sms.provider} name="sms_provider">
              <option value="none">None</option>
              <option value="termii">Termii</option>
              <option value="twilio">Twilio</option>
              <option value="africastalking">Africa&apos;s Talking</option>
            </select>
          </label>
          <label>
            <span>SMS sender ID</span>
            <input defaultValue={status.sms.sender_id ?? ''} name="sms_sender_id" />
          </label>
          <label>
            <span>SMS API key</span>
            <input autoComplete="off" name="sms_api_key" type="password" />
          </label>
          <label>
            <span>WhatsApp provider</span>
            <select defaultValue={status.whatsapp.provider} name="whatsapp_provider">
              <option value="none">None</option>
              <option value="meta">Meta Cloud API</option>
              <option value="twilio">Twilio</option>
            </select>
          </label>
          <label>
            <span>WhatsApp phone number ID</span>
            <input defaultValue={status.whatsapp.phone_number_id ?? ''} name="whatsapp_phone_number_id" />
          </label>
          <label>
            <span>WhatsApp access token</span>
            <input autoComplete="off" name="whatsapp_access_token" type="password" />
          </label>
          <label>
            <span>Push provider</span>
            <select defaultValue={status.push.provider} name="push_provider">
              <option value="none">None</option>
              <option value="fcm">Firebase Cloud Messaging</option>
            </select>
          </label>
          <label>
            <span>FCM server key</span>
            <input autoComplete="off" name="push_server_key" type="password" />
          </label>
          <label>
            <span>Retry attempts</span>
            <input defaultValue={status.retry?.max_attempts ?? 3} max={10} min={1} name="retry_max_attempts" type="number" />
          </label>
          <label>
            <span>Retry backoff (seconds)</span>
            <input defaultValue={status.retry?.backoff_seconds ?? 60} min={10} name="retry_backoff_seconds" type="number" />
          </label>
        </div>
        <footer className="form-footer">
          <button className="platform-primary" disabled={busy} type="submit">
            Save providers
          </button>
          <button className="ghost-button" disabled={busy} onClick={() => void activateCommunicationProvider().then(setStatus)} type="button">
            Activate
          </button>
          <button className="ghost-button" disabled={busy} onClick={() => void deactivateCommunicationProvider()} type="button">
            Deactivate
          </button>
        </footer>
      </article>
    </form>
  );
}
