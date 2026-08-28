'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { useBranding } from './branding-provider';
import {
  designFixturesEnabled,
  getPlatformBranding,
  platformApiConfigured,
  platformErrorMessage,
  removePlatformBrandAsset,
  updatePlatformBranding,
  uploadPlatformBrandAsset,
  type AdminBrandingStatus,
} from '../lib/admin-platform-api.ts';

const emptyBranding: AdminBrandingStatus = {
  app_name: 'Family House Connect',
  logo_url: null,
  favicon_url: null,
  configured: false,
  configuration_revision: 0,
  logo: null,
  favicon: null,
};

export function BrandingSettingsPanel() {
  const { t } = useLocale();
  const { refresh } = useBranding();
  const [status, setStatus] = useState<AdminBrandingStatus>(emptyBranding);
  const [appName, setAppName] = useState(emptyBranding.app_name);
  const [message, setMessage] = useState(
    t('settings.branding.loadHint', {
      defaultMessage: 'Upload a logo and favicon once. Admin, member, and public sites all use the same branding.',
    }),
  );
  const [busy, setBusy] = useState(false);
  const fixtures = designFixturesEnabled();

  const refreshStatus = useCallback(async () => {
    if (fixtures) {
      setStatus(emptyBranding);
      setAppName(emptyBranding.app_name);
      setMessage(
        t('settings.branding.fixturesDisabled', {
          defaultMessage: 'Design fixtures enabled — branding uploads are not calling the live API.',
        }),
      );
      return;
    }
    if (!platformApiConfigured()) {
      setMessage(
        t('settings.branding.apiUrlRequired', {
          defaultMessage: 'Set NEXT_PUBLIC_FHC_API_URL so branding can be loaded and saved.',
        }),
      );
      return;
    }
    setBusy(true);
    try {
      const data = await getPlatformBranding();
      setStatus(data);
      setAppName(data.app_name);
      setMessage(
        data.logo_url || data.favicon_url
          ? t('settings.branding.published', {
              defaultMessage: 'Live branding is published to admin, member, and public sites.',
            })
          : t('settings.branding.empty', {
              defaultMessage: 'No logo or favicon yet. PNG, JPG, WEBP, SVG, or ICO up to 5 MB.',
            }),
      );
    } catch (error) {
      setMessage(
        platformErrorMessage(
          error,
          t('errors.brandingLoad', {
            defaultMessage: 'Could not load branding. Sign in as a platform admin with recent MFA.',
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }, [fixtures, t]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  async function onSaveName(event: FormEvent) {
    event.preventDefault();
    if (fixtures || !platformApiConfigured()) return;
    setBusy(true);
    try {
      const data = await updatePlatformBranding(appName.trim());
      setStatus(data);
      setAppName(data.app_name);
      await refresh();
      setMessage(
        t('settings.branding.nameSaved', {
          defaultMessage: 'Display name saved as {name}.',
          vars: { name: data.app_name },
        }),
      );
    } catch (error) {
      setMessage(
        platformErrorMessage(
          error,
          t('errors.brandingSaveName', { defaultMessage: 'Could not save the display name.' }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(kind: 'logo' | 'favicon', file: File | undefined) {
    if (!file || fixtures || !platformApiConfigured()) return;
    setBusy(true);
    try {
      const data = await uploadPlatformBrandAsset(kind, file);
      setStatus(data);
      await refresh();
      setMessage(
        kind === 'logo'
          ? t('settings.branding.logoPublished', {
              defaultMessage: 'Logo published across admin, member, and public sites.',
            })
          : t('settings.branding.faviconPublished', {
              defaultMessage: 'Favicon published across admin, member, and public sites.',
            }),
      );
    } catch (error) {
      setMessage(
        platformErrorMessage(
          error,
          t('errors.brandingUpload', {
            defaultMessage: 'Could not upload the {kind}. Use PNG, JPG, WEBP, SVG, or ICO.',
            vars: { kind },
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(kind: 'logo' | 'favicon') {
    if (fixtures || !platformApiConfigured()) return;
    setBusy(true);
    try {
      const data = await removePlatformBrandAsset(kind);
      setStatus(data);
      await refresh();
      setMessage(
        kind === 'logo'
          ? t('settings.branding.logoRemoved', {
              defaultMessage: 'Logo removed. Sites will use the default mark until you upload another.',
            })
          : t('settings.branding.faviconRemoved', {
              defaultMessage: 'Favicon removed. Sites will use the default mark until you upload another.',
            }),
      );
    } catch (error) {
      setMessage(
        platformErrorMessage(
          error,
          t('errors.brandingRemove', {
            defaultMessage: 'Could not remove the {kind}.',
            vars: { kind },
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card settings-card ministry-settings branding-settings">
      <p className="maps-settings-lead" role="status">
        {message}
      </p>
      <form className="form-grid" onSubmit={onSaveName}>
        <label className="full">
          <span>{t('settings.branding.applicationName', { defaultMessage: 'Application name' })}</span>
          <input value={appName} onChange={(event) => setAppName(event.target.value)} required maxLength={120} disabled={busy || fixtures} />
        </label>
        <div className="form-footer full">
          <button className="ghost-button" type="button" data-interaction-native="true" onClick={() => void refreshStatus()} disabled={busy}>
            {t('common.refresh', { defaultMessage: 'Refresh' })}
          </button>
          <button className="primary-button" type="submit" data-interaction-native="true" disabled={busy || fixtures}>
            {t('settings.branding.saveName', { defaultMessage: 'Save name' })}
          </button>
        </div>
      </form>
      <div className="branding-asset-grid">
        <article className="branding-asset-card">
          <h3>{t('settings.branding.appLogo', { defaultMessage: 'App logo' })}</h3>
          <p>
            {t('settings.branding.appLogoCopy', {
              defaultMessage: 'Shown in the admin sidebar, public header, member portal, and sign-in screens.',
            })}
          </p>
          <div className="branding-preview">
            {status.logo_url ? (
              <img src={status.logo_url} alt={t('settings.branding.logoAlt', { defaultMessage: 'Current application logo' })} />
            ) : (
              <span>{t('settings.branding.noLogo', { defaultMessage: 'No logo' })}</span>
            )}
          </div>
          <label className="branding-file">
            <span>{t('settings.branding.uploadLogo', { defaultMessage: 'Upload logo' })}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico"
              disabled={busy || fixtures}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                void onUpload('logo', file);
              }}
            />
          </label>
          <button className="ghost-button" type="button" data-interaction-native="true" disabled={busy || fixtures || !status.logo_url} onClick={() => void onRemove('logo')}>
            {t('settings.branding.removeLogo', { defaultMessage: 'Remove logo' })}
          </button>
        </article>
        <article className="branding-asset-card">
          <h3>{t('settings.branding.favicon', { defaultMessage: 'Favicon' })}</h3>
          <p>
            {t('settings.branding.faviconCopy', {
              defaultMessage: 'Browser tab icon for admin, member, and public pages. Square PNG works best.',
            })}
          </p>
          <div className="branding-preview favicon">
            {status.favicon_url ? (
              <img src={status.favicon_url} alt={t('settings.branding.faviconAlt', { defaultMessage: 'Current favicon' })} />
            ) : (
              <span>{t('settings.branding.noFavicon', { defaultMessage: 'No favicon' })}</span>
            )}
          </div>
          <label className="branding-file">
            <span>{t('settings.branding.uploadFavicon', { defaultMessage: 'Upload favicon' })}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico"
              disabled={busy || fixtures}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                void onUpload('favicon', file);
              }}
            />
          </label>
          <button className="ghost-button" type="button" data-interaction-native="true" disabled={busy || fixtures || !status.favicon_url} onClick={() => void onRemove('favicon')}>
            {t('settings.branding.removeFavicon', { defaultMessage: 'Remove favicon' })}
          </button>
        </article>
      </div>
    </div>
  );
}
