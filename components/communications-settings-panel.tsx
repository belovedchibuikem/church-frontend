'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
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

type ChannelSection = 'email' | 'sms' | 'whatsapp' | 'push' | 'policy';

const emptyStatus: CommunicationProviderStatus = {
  configured: false,
  active: false,
  email: {
    provider: 'smtp',
    credentials_configured: false,
    smtp: { encryption: 'tls', password_configured: false },
  },
  sms: { provider: 'none', credentials_configured: false },
  whatsapp: { provider: 'none', credentials_configured: false },
  push: { provider: 'none', credentials_configured: false },
  consent_required_channels: ['email', 'sms', 'whatsapp', 'push'],
  retry: { max_attempts: 3, backoff_seconds: 60 },
};

function ChannelBadge({ configured, active }: { configured: boolean; active?: boolean }) {
  const { t } = useLocale();
  if (active) {
    return (
      <span className="comm-channel-badge live">
        {t('settings.communications.statusLive', { defaultMessage: 'Live' })}
      </span>
    );
  }
  if (configured) {
    return (
      <span className="comm-channel-badge ready">
        {t('settings.communications.statusReady', { defaultMessage: 'Configured' })}
      </span>
    );
  }
  return (
    <span className="comm-channel-badge idle">
      {t('settings.communications.statusNotSet', { defaultMessage: 'Not configured' })}
    </span>
  );
}

export function CommunicationsSettingsPanel() {
  const { t } = useLocale();
  const [section, setSection] = useState<ChannelSection>('email');
  const [status, setStatus] = useState<CommunicationProviderStatus>(emptyStatus);
  const [emailProvider, setEmailProvider] = useState('smtp');
  const [message, setMessage] = useState(
    t('settings.communications.loadHint', {
      defaultMessage: 'Load live communication providers, sender identities, consent, and retry policy.',
    }),
  );
  const [messageTone, setMessageTone] = useState<'info' | 'error' | 'success'>('info');
  const [busy, setBusy] = useState(false);
  const fixtures = designFixturesEnabled();

  const refresh = useCallback(async () => {
    if (fixtures || !platformApiConfigured()) {
      setMessageTone('info');
      setMessage(
        fixtures
          ? t('settings.communications.fixturesDisabled', {
              defaultMessage: 'Design fixtures enabled — live communication settings are disabled.',
            })
          : t('settings.communications.apiUrlRequired', {
              defaultMessage: 'Set NEXT_PUBLIC_FHC_API_URL to load providers.',
            }),
      );
      return;
    }
    setBusy(true);
    try {
      const data = await getCommunicationProvider();
      setStatus(data);
      setEmailProvider(data.email.provider === 'none' ? 'smtp' : data.email.provider);
      setMessageTone('info');
      setMessage(
        data.active
          ? t('settings.communications.active', {
              defaultMessage: 'Communication providers are active for governed deliveries.',
            })
          : t('settings.communications.inactive', {
              defaultMessage: 'Save each channel, then activate. Unconfigured channels stay suppressed.',
            }),
      );
    } catch (error) {
      setMessageTone('error');
      setMessage(
        platformErrorMessage(
          error,
          t('errors.communicationsLoad', {
            defaultMessage: 'Could not load communication providers. Requires platform.communications.* and recent MFA.',
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

  const navItems = useMemo(
    () =>
      [
        {
          id: 'email' as const,
          label: t('settings.communications.navEmail', { defaultMessage: 'Email (SMTP)' }),
          configured: status.email.credentials_configured,
        },
        {
          id: 'sms' as const,
          label: t('settings.communications.navSms', { defaultMessage: 'SMS' }),
          configured: status.sms.credentials_configured,
        },
        {
          id: 'whatsapp' as const,
          label: t('settings.communications.navWhatsapp', { defaultMessage: 'WhatsApp' }),
          configured: status.whatsapp.credentials_configured,
        },
        {
          id: 'push' as const,
          label: t('settings.communications.navPush', { defaultMessage: 'Push notifications' }),
          configured: status.push.credentials_configured,
        },
        {
          id: 'policy' as const,
          label: t('settings.communications.navPolicy', { defaultMessage: 'Delivery policy' }),
          configured: true,
        },
      ] satisfies Array<{ id: ChannelSection; label: string; configured: boolean }>,
    [status, t],
  );

  async function onActivate() {
    if (fixtures || !platformApiConfigured()) return;
    setBusy(true);
    try {
      const data = await activateCommunicationProvider();
      setStatus(data);
      setMessageTone('success');
      setMessage(
        t('settings.communications.active', {
          defaultMessage: 'Communication providers are active for governed deliveries.',
        }),
      );
    } catch (error) {
      setMessageTone('error');
      setMessage(
        platformErrorMessage(
          error,
          t('errors.communicationsActivate', {
            defaultMessage: 'Activation failed. Confirm platform.communications.manage and recent MFA.',
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
      await deactivateCommunicationProvider();
      await refresh();
      setMessageTone('success');
    } catch (error) {
      setMessageTone('error');
      setMessage(
        platformErrorMessage(
          error,
          t('errors.communicationsDeactivate', {
            defaultMessage: 'Deactivation failed. Confirm platform.communications.manage and recent MFA.',
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fixtures || !platformApiConfigured()) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        email_provider: String(form.get('email_provider') || 'smtp'),
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

      const provider = String(form.get('email_provider') || 'smtp');
      if (provider === 'smtp') {
        body.email_smtp_host = String(form.get('email_smtp_host') || '');
        body.email_smtp_port = Number(form.get('email_smtp_port') || 587);
        body.email_smtp_username = String(form.get('email_smtp_username') || '');
        body.email_smtp_encryption = String(form.get('email_smtp_encryption') || 'tls');
        const smtpPassword = String(form.get('email_smtp_password') || '').trim();
        if (smtpPassword) body.email_smtp_password = smtpPassword;
      } else {
        const emailKey = String(form.get('email_api_key') || '').trim();
        if (emailKey) body.email_api_key = emailKey;
      }

      const smsKey = String(form.get('sms_api_key') || '').trim();
      const waToken = String(form.get('whatsapp_access_token') || '').trim();
      const pushKey = String(form.get('push_server_key') || '').trim();
      if (smsKey) body.sms_api_key = smsKey;
      if (waToken) body.whatsapp_access_token = waToken;
      if (pushKey) body.push_server_key = pushKey;

      const data = await configureCommunicationProvider(body);
      setStatus(data);
      setEmailProvider(data.email.provider === 'none' ? 'smtp' : data.email.provider);
      setMessageTone('success');
      setMessage(
        t('settings.communications.saved', {
          defaultMessage: 'Settings saved. Activate when all required channels are ready.',
        }),
      );
    } catch (error) {
      setMessageTone('error');
      setMessage(
        platformErrorMessage(
          error,
          t('errors.communicationsSave', {
            defaultMessage: 'Save failed. Confirm platform.communications.manage and recent MFA.',
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const noneLabel = t('common.none', { defaultMessage: 'None' });
  const smtp = status.email.smtp;
  const isSmtp = emailProvider === 'smtp';

  return (
    <form className="platform-settings comm-settings" onSubmit={onSave}>
      <aside className="platform-card comm-settings-nav" aria-label={t('settings.communications.channels', { defaultMessage: 'Communication channels' })}>
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={section === item.id ? 'active' : ''}
            onClick={() => setSection(item.id)}
          >
            <span>{item.label}</span>
            {item.id !== 'policy' ? <ChannelBadge configured={item.configured} active={status.active && item.configured} /> : null}
          </button>
        ))}
      </aside>

      <article className="platform-card platform-settings-body comm-settings-body">
        <header className="platform-settings-heading">
          <span className="platform-overline">
            {t('settings.communications.overline', { defaultMessage: 'COMMUNICATIONS' })}
          </span>
          <h2>{t('settings.communications.title', { defaultMessage: 'Providers, consent, and delivery policy' })}</h2>
          <p>
            {t('settings.communications.delegatedWith', { defaultMessage: 'Delegated with' })}{' '}
            <code>platform.communications.manage</code>.{' '}
            {t('settings.communications.copy', {
              defaultMessage: 'Secrets are write-only. Audience consent still applies before delivery.',
            })}
          </p>
        </header>

        <div className={`comm-settings-alert ${messageTone}`} role="status">
          {message}
        </div>

        <div className="comm-settings-status-row">
          <span className={status.active ? 'live' : 'idle'}>
            {status.active
              ? t('settings.communications.platformActive', { defaultMessage: 'Platform delivery: Active' })
              : t('settings.communications.platformInactive', { defaultMessage: 'Platform delivery: Inactive' })}
          </span>
          <ChannelBadge configured={status.email.credentials_configured} active={status.active} />
        </div>

        {section === 'email' && (
          <section className="comm-channel-panel">
            <header>
              <h3>{t('settings.communications.emailSetup', { defaultMessage: 'Email delivery' })}</h3>
              <p>{t('settings.communications.emailSetupHint', { defaultMessage: 'Configure SMTP for transactional and broadcast email.' })}</p>
            </header>
            <div className="platform-form-grid">
              <label>
                <span>{t('settings.communications.emailProvider', { defaultMessage: 'Delivery type' })}</span>
                <select
                  name="email_provider"
                  value={emailProvider}
                  onChange={(event) => setEmailProvider(event.target.value)}
                >
                  <option value="smtp">{t('settings.communications.smtp', { defaultMessage: 'SMTP' })}</option>
                  <option value="resend">{t('settings.communications.resend', { defaultMessage: 'Resend' })}</option>
                  <option value="ses">{t('settings.communications.ses', { defaultMessage: 'Amazon SES' })}</option>
                  <option value="mailgun">{t('settings.communications.mailgun', { defaultMessage: 'Mailgun' })}</option>
                  <option value="none">{noneLabel}</option>
                </select>
              </label>
              <label>
                <span>{t('settings.communications.fromName', { defaultMessage: 'From name' })}</span>
                <input defaultValue={status.email.sender_name ?? ''} name="email_sender_name" placeholder="Family House Connect" />
              </label>
              <label className="wide">
                <span>{t('settings.communications.fromAddress', { defaultMessage: 'From email address' })}</span>
                <input
                  defaultValue={status.email.sender_address ?? ''}
                  name="email_sender_address"
                  type="email"
                  placeholder="noreply@yourchurch.org"
                />
              </label>

              {isSmtp ? (
                <>
                  <label>
                    <span>{t('settings.communications.smtpHost', { defaultMessage: 'SMTP host' })}</span>
                    <input defaultValue={smtp?.host ?? ''} name="email_smtp_host" placeholder="smtp.mailprovider.com" required />
                  </label>
                  <label>
                    <span>{t('settings.communications.smtpPort', { defaultMessage: 'SMTP port' })}</span>
                    <input defaultValue={smtp?.port ?? 587} name="email_smtp_port" type="number" min={1} max={65535} required />
                  </label>
                  <label>
                    <span>{t('settings.communications.smtpUsername', { defaultMessage: 'SMTP username' })}</span>
                    <input defaultValue={smtp?.username ?? ''} name="email_smtp_username" autoComplete="off" required />
                  </label>
                  <label>
                    <span>{t('settings.communications.smtpEncryption', { defaultMessage: 'Encryption' })}</span>
                    <select defaultValue={smtp?.encryption ?? 'tls'} name="email_smtp_encryption">
                      <option value="tls">{t('settings.communications.encryptionTls', { defaultMessage: 'TLS (recommended)' })}</option>
                      <option value="ssl">{t('settings.communications.encryptionSsl', { defaultMessage: 'SSL' })}</option>
                      <option value="none">{t('settings.communications.encryptionNone', { defaultMessage: 'None' })}</option>
                    </select>
                  </label>
                  <label className="wide">
                    <span>{t('settings.communications.smtpPassword', { defaultMessage: 'SMTP password' })}</span>
                    <input
                      autoComplete="new-password"
                      name="email_smtp_password"
                      type="password"
                      placeholder={
                        smtp?.password_configured
                          ? t('settings.communications.passwordSaved', { defaultMessage: '•••••••• (leave blank to keep saved password)' })
                          : t('settings.communications.passwordEnter', { defaultMessage: 'Enter SMTP password' })
                      }
                    />
                  </label>
                </>
              ) : emailProvider !== 'none' ? (
                <label className="wide">
                  <span>{t('settings.communications.emailApiKey', { defaultMessage: 'Provider API key' })}</span>
                  <input autoComplete="off" name="email_api_key" type="password" placeholder={t('settings.communications.apiKeyPlaceholder', { defaultMessage: 'Paste API key (write-only)' })} />
                </label>
              ) : null}
            </div>
          </section>
        )}

        {section === 'sms' && (
          <section className="comm-channel-panel">
            <header>
              <h3>{t('settings.communications.smsSetup', { defaultMessage: 'SMS delivery' })}</h3>
              <p>{t('settings.communications.smsSetupHint', { defaultMessage: 'Connect an SMS gateway for alerts and campaigns.' })}</p>
            </header>
            <div className="platform-form-grid">
              <label>
                <span>{t('settings.communications.smsProvider', { defaultMessage: 'SMS provider' })}</span>
                <select defaultValue={status.sms.provider} name="sms_provider">
                  <option value="none">{noneLabel}</option>
                  <option value="termii">{t('settings.communications.termii', { defaultMessage: 'Termii' })}</option>
                  <option value="twilio">{t('settings.communications.twilio', { defaultMessage: 'Twilio' })}</option>
                  <option value="africastalking">{t('settings.communications.africasTalking', { defaultMessage: "Africa's Talking" })}</option>
                </select>
              </label>
              <label>
                <span>{t('settings.communications.smsSenderId', { defaultMessage: 'Sender ID' })}</span>
                <input defaultValue={status.sms.sender_id ?? ''} name="sms_sender_id" placeholder="FHC" />
              </label>
              <label className="wide">
                <span>{t('settings.communications.smsApiKey', { defaultMessage: 'API key' })}</span>
                <input autoComplete="off" name="sms_api_key" type="password" placeholder={t('settings.communications.apiKeyPlaceholder', { defaultMessage: 'Paste API key (write-only)' })} />
              </label>
            </div>
          </section>
        )}

        {section === 'whatsapp' && (
          <section className="comm-channel-panel">
            <header>
              <h3>{t('settings.communications.whatsappSetup', { defaultMessage: 'WhatsApp delivery' })}</h3>
              <p>{t('settings.communications.whatsappSetupHint', { defaultMessage: 'Meta Cloud API or Twilio credentials for WhatsApp messaging.' })}</p>
            </header>
            <div className="platform-form-grid">
              <label>
                <span>{t('settings.communications.whatsappProvider', { defaultMessage: 'WhatsApp provider' })}</span>
                <select defaultValue={status.whatsapp.provider} name="whatsapp_provider">
                  <option value="none">{noneLabel}</option>
                  <option value="meta">{t('settings.communications.metaCloud', { defaultMessage: 'Meta Cloud API' })}</option>
                  <option value="twilio">{t('settings.communications.twilio', { defaultMessage: 'Twilio' })}</option>
                </select>
              </label>
              <label>
                <span>{t('settings.communications.whatsappPhoneNumberId', { defaultMessage: 'Phone number ID' })}</span>
                <input defaultValue={status.whatsapp.phone_number_id ?? ''} name="whatsapp_phone_number_id" />
              </label>
              <label className="wide">
                <span>{t('settings.communications.whatsappAccessToken', { defaultMessage: 'Access token' })}</span>
                <input autoComplete="off" name="whatsapp_access_token" type="password" placeholder={t('settings.communications.apiKeyPlaceholder', { defaultMessage: 'Paste API key (write-only)' })} />
              </label>
            </div>
          </section>
        )}

        {section === 'push' && (
          <section className="comm-channel-panel">
            <header>
              <h3>{t('settings.communications.pushSetup', { defaultMessage: 'Push notifications' })}</h3>
              <p>{t('settings.communications.pushSetupHint', { defaultMessage: 'Firebase Cloud Messaging for mobile push alerts.' })}</p>
            </header>
            <div className="platform-form-grid">
              <label>
                <span>{t('settings.communications.pushProvider', { defaultMessage: 'Push provider' })}</span>
                <select defaultValue={status.push.provider} name="push_provider">
                  <option value="none">{noneLabel}</option>
                  <option value="fcm">{t('settings.communications.fcm', { defaultMessage: 'Firebase Cloud Messaging' })}</option>
                </select>
              </label>
              <label className="wide">
                <span>{t('settings.communications.fcmServerKey', { defaultMessage: 'FCM server key' })}</span>
                <input autoComplete="off" name="push_server_key" type="password" placeholder={t('settings.communications.apiKeyPlaceholder', { defaultMessage: 'Paste API key (write-only)' })} />
              </label>
            </div>
          </section>
        )}

        {section === 'policy' && (
          <section className="comm-channel-panel">
            <header>
              <h3>{t('settings.communications.policySetup', { defaultMessage: 'Delivery policy' })}</h3>
              <p>{t('settings.communications.policySetupHint', { defaultMessage: 'Retry behaviour for failed deliveries across all channels.' })}</p>
            </header>
            <div className="platform-form-grid">
              <label>
                <span>{t('settings.communications.retryAttempts', { defaultMessage: 'Retry attempts' })}</span>
                <input defaultValue={status.retry?.max_attempts ?? 3} max={10} min={1} name="retry_max_attempts" type="number" />
              </label>
              <label>
                <span>{t('settings.communications.retryBackoff', { defaultMessage: 'Retry backoff (seconds)' })}</span>
                <input defaultValue={status.retry?.backoff_seconds ?? 60} min={10} name="retry_backoff_seconds" type="number" />
              </label>
            </div>
            <aside className="comm-policy-note">
              <strong>{t('settings.communications.consentTitle', { defaultMessage: 'Audience consent' })}</strong>
              <p>{t('settings.communications.consentCopy', { defaultMessage: 'Email, SMS, WhatsApp, and push deliveries require recorded audience consent before send.' })}</p>
            </aside>
          </section>
        )}

        <footer className="form-footer comm-settings-footer">
          <button className="ghost-button" disabled={busy} onClick={() => void refresh()} type="button">
            {t('common.refresh', { defaultMessage: 'Refresh' })}
          </button>
          <button className="ghost-button" disabled={busy} onClick={() => void onDeactivate()} type="button">
            {t('common.deactivate', { defaultMessage: 'Deactivate' })}
          </button>
          <button className="ghost-button" disabled={busy} onClick={() => void onActivate()} type="button">
            {t('common.activate', { defaultMessage: 'Activate' })}
          </button>
          <button className="platform-primary" disabled={busy} type="submit">
            {busy
              ? t('common.saving', { defaultMessage: 'Saving…' })
              : t('settings.communications.saveProviders', { defaultMessage: 'Save settings' })}
          </button>
        </footer>
      </article>
    </form>
  );
}
