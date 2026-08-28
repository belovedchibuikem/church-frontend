'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import {
  activateMapsProvider,
  configureMapsProvider,
  deactivateMapsProvider,
  designFixturesEnabled,
  getMapsProvider,
  platformApiConfigured,
  platformErrorMessage,
  type MapsProvider,
  type MapsProviderStatus,
} from '../lib/admin-platform-api.ts';

const emptyStatus: MapsProviderStatus = {
  configured: false,
  active: false,
  active_provider: 'leaflet',
  providers: {
    google: { key_configured: false },
    mapbox: { key_configured: false },
    leaflet: { key_configured: true, tile_url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  },
  default_center: { latitude: 6.5244, longitude: 3.3792 },
  default_zoom: 12,
};

export function MapsSettingsPanel() {
  const { t } = useLocale();
  const [status, setStatus] = useState<MapsProviderStatus>(emptyStatus);
  const [provider, setProvider] = useState<MapsProvider>('leaflet');
  const [googleKey, setGoogleKey] = useState('');
  const [mapboxToken, setMapboxToken] = useState('');
  const [message, setMessage] = useState(
    t('settings.maps.loadHint', {
      defaultMessage:
        'Enter any one provider key (or choose Leaflet with no key), then activate. Public find-church maps stay unavailable until activation.',
    }),
  );
  const [busy, setBusy] = useState(false);
  const fixtures = designFixturesEnabled();

  const refresh = useCallback(async () => {
    if (fixtures) {
      setStatus(emptyStatus);
      setProvider('leaflet');
      setMessage(
        t('settings.maps.fixturesDisabled', {
          defaultMessage: 'Design fixtures enabled — maps configuration is not calling the live API.',
        }),
      );
      return;
    }
    if (!platformApiConfigured()) {
      setMessage(
        t('settings.maps.apiUrlRequired', {
          defaultMessage: 'Set NEXT_PUBLIC_FHC_API_URL (e.g. http://localhost:8000/api/v1) to load live maps configuration.',
        }),
      );
      return;
    }
    setBusy(true);
    try {
      const data = await getMapsProvider();
      setStatus(data);
      setProvider(data.active_provider);
      setMessage(
        data.active
          ? t('settings.maps.liveProvider', {
              defaultMessage: 'Live provider: {provider}',
              vars: { provider: data.active_provider },
            })
          : t('settings.maps.inactive', {
              defaultMessage: 'Saved keys are not public yet — activate one provider so find-church / directions go live.',
            }),
      );
    } catch (error) {
      setMessage(
        platformErrorMessage(
          error,
          t('errors.mapsLoad', {
            defaultMessage:
              'Could not reach the admin maps API. Sign in as a platform admin with maps permissions and recent MFA.',
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

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (fixtures) {
      setMessage(
        t('settings.maps.saveDisabled', { defaultMessage: 'Design fixtures enabled — save is disabled.' }),
      );
      return;
    }
    if (!platformApiConfigured()) {
      setMessage(
        t('settings.maps.configureApiUrl', {
          defaultMessage: 'Configure NEXT_PUBLIC_FHC_API_URL to persist keys.',
        }),
      );
      return;
    }
    setBusy(true);
    try {
      const body = {
        active_provider: provider,
        default_latitude: status.default_center?.latitude ?? 6.5244,
        default_longitude: status.default_center?.longitude ?? 3.3792,
        default_zoom: status.default_zoom ?? 12,
        ...(googleKey.trim() ? { google_api_key: googleKey.trim() } : {}),
        ...(mapboxToken.trim() ? { mapbox_access_token: mapboxToken.trim() } : {}),
      };
      const data = await configureMapsProvider(body);
      setStatus(data);
      setGoogleKey('');
      setMapboxToken('');
      setMessage(
        t('settings.maps.saved', {
          defaultMessage: 'Saved {provider}. Click Activate to make it live for web and mobile.',
          vars: { provider },
        }),
      );
    } catch (error) {
      setMessage(
        platformErrorMessage(
          error,
          t('errors.mapsSave', {
            defaultMessage: 'Save failed. Confirm admin session, recent MFA, and platform.maps.manage.',
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    if (fixtures || !platformApiConfigured()) return;
    setBusy(true);
    try {
      const data = await activateMapsProvider();
      setStatus(data);
      setProvider(data.active_provider);
      setMessage(
        t('settings.maps.activated', {
          defaultMessage: 'Active provider: {provider}. Public clients will use this configuration.',
          vars: { provider: data.active_provider },
        }),
      );
    } catch (error) {
      setMessage(
        platformErrorMessage(
          error,
          t('errors.mapsActivate', {
            defaultMessage: 'Activation failed. Google/Mapbox need a saved key; Leaflet works without one.',
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    if (fixtures || !platformApiConfigured()) return;
    setBusy(true);
    try {
      const data = await deactivateMapsProvider();
      setStatus((prev) => ({
        ...prev,
        active: data.active,
        active_provider: data.active_provider,
      }));
      setProvider(data.active_provider);
      setMessage(
        t('settings.maps.deactivated', {
          defaultMessage: 'Maps deactivated. Active provider projection: {provider}.',
          vars: { provider: data.active_provider },
        }),
      );
    } catch (error) {
      setMessage(
        platformErrorMessage(
          error,
          t('errors.mapsDeactivate', {
            defaultMessage: 'Deactivation failed. Confirm admin session and platform.maps.manage.',
          }),
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const savedSuffix = t('settings.maps.keySaved', { defaultMessage: '(saved)' });
  const keepPlaceholder = t('settings.maps.keepPlaceholder', {
    defaultMessage: '•••••••• (leave blank to keep)',
  });

  return (
    <form className="card settings-card ministry-settings maps-settings" onSubmit={onSave}>
      <p className="maps-settings-lead">{message}</p>
      <div className="form-grid">
        <label className="full">
          <span>{t('settings.maps.activeProvider', { defaultMessage: 'Active provider (pick any one)' })}</span>
          <select value={provider} onChange={(event) => setProvider(event.target.value as MapsProvider)} disabled={busy}>
            <option value="leaflet">
              {t('settings.maps.leafletOption', { defaultMessage: 'Leaflet / OpenStreetMap (no API key)' })}
            </option>
            <option value="google">{t('settings.maps.google', { defaultMessage: 'Google Maps' })}</option>
            <option value="mapbox">{t('settings.maps.mapbox', { defaultMessage: 'Mapbox' })}</option>
          </select>
        </label>
        <label className="full">
          <span>
            {t('settings.maps.googleKey', { defaultMessage: 'Google Maps API key' })}
            {status.providers.google.key_configured ? ` ${savedSuffix}` : ''}
          </span>
          <input
            type="password"
            autoComplete="off"
            placeholder={
              status.providers.google.key_configured
                ? keepPlaceholder
                : t('settings.maps.googlePlaceholder', { defaultMessage: 'Paste Google Maps browser key' })
            }
            value={googleKey}
            onChange={(event) => setGoogleKey(event.target.value)}
            disabled={busy}
          />
        </label>
        <label className="full">
          <span>
            {t('settings.maps.mapboxToken', { defaultMessage: 'Mapbox access token' })}
            {status.providers.mapbox.key_configured ? ` ${savedSuffix}` : ''}
          </span>
          <input
            type="password"
            autoComplete="off"
            placeholder={
              status.providers.mapbox.key_configured
                ? keepPlaceholder
                : t('settings.maps.mapboxPlaceholder', { defaultMessage: 'Paste Mapbox public token' })
            }
            value={mapboxToken}
            onChange={(event) => setMapboxToken(event.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          <span>{t('settings.maps.status', { defaultMessage: 'Status' })}</span>
          <input
            readOnly
            value={
              status.active
                ? t('settings.maps.statusActive', {
                    defaultMessage: 'Active · {provider}',
                    vars: { provider: status.active_provider },
                  })
                : t('settings.maps.statusInactive', { defaultMessage: 'Inactive' })
            }
          />
        </label>
        <label>
          <span>{t('settings.maps.configured', { defaultMessage: 'Configured' })}</span>
          <input
            readOnly
            value={status.configured ? t('common.yes', { defaultMessage: 'Yes' }) : t('common.no', { defaultMessage: 'No' })}
          />
        </label>
      </div>
      <div className="form-footer">
        <button className="ghost-button" type="button" onClick={() => void refresh()} disabled={busy}>
          {t('common.refresh', { defaultMessage: 'Refresh' })}
        </button>
        <button className="ghost-button" type="button" onClick={() => void deactivate()} disabled={busy || fixtures}>
          {t('common.deactivate', { defaultMessage: 'Deactivate' })}
        </button>
        <button className="ghost-button" type="button" onClick={() => void activate()} disabled={busy || fixtures}>
          {t('common.activate', { defaultMessage: 'Activate' })}
        </button>
        <button className="primary-button" type="submit" disabled={busy || fixtures}>
          {t('settings.maps.saveProvider', { defaultMessage: 'Save Provider' })}
        </button>
      </div>
    </form>
  );
}
