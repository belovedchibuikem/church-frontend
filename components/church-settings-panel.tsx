'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import {
  listConfigurations,
  platformApiConfigured,
  platformErrorMessage,
  upsertConfiguration,
  type PlatformConfiguration,
} from '../lib/admin-platform-api';

const FOLLOW_UP_KEY = 'church.first_timer_follow_up_after_hours';

export function ChurchSettingsPanel() {
  const { t } = useLocale();
  const [hours, setHours] = useState('72');
  const [existing, setExisting] = useState<PlatformConfiguration | null>(null);
  const [message, setMessage] = useState(() => t('admin.loadingChurchSettings', { defaultMessage: 'Loading church settings…' }));
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!platformApiConfigured()) {
      setMessage(t('admin.setApiUrlChurchSettings', { defaultMessage: 'Set NEXT_PUBLIC_FHC_API_URL to load church settings.' }));
      return;
    }
    setBusy(true);
    try {
      const result = await listConfigurations({ per_page: 100, sort: 'key' });
      const match = result.items.find((item) => item.key === FOLLOW_UP_KEY) ?? null;
      setExisting(match);
      if (match?.value !== null && match?.value !== undefined) {
        setHours(String(match.value));
      }
      setMessage(
        match
          ? t('admin.loadedChurchSettings', { defaultMessage: 'Loaded church follow-up configuration.' })
          : t('admin.churchSettingsDefaults', { defaultMessage: 'No override saved yet. Saving writes {key}.', vars: { key: FOLLOW_UP_KEY } }),
      );
    } catch (error) {
      setMessage(platformErrorMessage(error, t('errors.loadChurchSettings', { defaultMessage: 'Unable to load church settings.' })));
    } finally {
      setBusy(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    const parsed = Number.parseInt(hours, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setMessage(t('admin.invalidFollowUpHours', { defaultMessage: 'Enter a positive number of hours.' }));
      return;
    }
    setBusy(true);
    try {
      await upsertConfiguration({
        key: FOLLOW_UP_KEY,
        value_type: 'integer',
        classification: 'internal',
        environment: existing?.environment ?? 'production',
        value: parsed,
      });
      setMessage(t('admin.churchSettingsSaved', { defaultMessage: 'Church follow-up hours saved.' }));
      await refresh();
    } catch (error) {
      setMessage(platformErrorMessage(error, t('errors.saveChurchSettings', { defaultMessage: 'Save failed. Confirm platform.configuration.manage.' })));
      setBusy(false);
    }
  }

  return (
    <form className="platform-settings" onSubmit={(event) => void onSave(event)}>
      <article className="platform-card platform-settings-body">
        <h2>{t('admin.churchSettings', { defaultMessage: 'Church Settings' })}</h2>
        <p className="maps-settings-lead" role="status">
          {t('admin.churchSettingsLead', {
            defaultMessage: 'Uses the platform configurations API for keys consumed by church policy. There is no separate church-settings CRUD endpoint.',
          })}
        </p>
        <p className="maps-settings-lead">{message}</p>
        <label>
          <span>{t('admin.firstTimerFollowUpHours', { defaultMessage: 'First-timer follow-up after (hours)' })}</span>
          <input
            type="number"
            min={1}
            max={8760}
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            disabled={busy}
            required
          />
        </label>
        <p className="maps-settings-lead">
          <code>{FOLLOW_UP_KEY}</code>
        </p>
        <footer>
          <button className="platform-primary" type="submit" disabled={busy}>
            {busy ? t('admin.saving', { defaultMessage: 'Saving…' }) : t('common.saveChanges', { defaultMessage: 'Save Changes' })}
          </button>
        </footer>
      </article>
    </form>
  );
}
