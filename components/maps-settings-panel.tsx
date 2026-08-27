'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
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
  const [status, setStatus] = useState<MapsProviderStatus>(emptyStatus);
  const [provider, setProvider] = useState<MapsProvider>('leaflet');
  const [googleKey, setGoogleKey] = useState('');
  const [mapboxToken, setMapboxToken] = useState('');
  const [message, setMessage] = useState(
    'Enter any one provider key (or choose Leaflet with no key), then activate. Public find-church maps stay unavailable until activation.',
  );
  const [busy, setBusy] = useState(false);
  const fixtures = designFixturesEnabled();

  const refresh = useCallback(async () => {
    if (fixtures) {
      setStatus(emptyStatus);
      setProvider('leaflet');
      setMessage('Design fixtures enabled — maps configuration is not calling the live API.');
      return;
    }
    if (!platformApiConfigured()) {
      setMessage('Set NEXT_PUBLIC_FHC_API_URL (e.g. http://localhost:8000/api/v1) to load live maps configuration.');
      return;
    }
    setBusy(true);
    try {
      const data = await getMapsProvider();
      setStatus(data);
      setProvider(data.active_provider);
      setMessage(
        data.active
          ? `Live provider: ${data.active_provider}`
          : 'Saved keys are not public yet — activate one provider so find-church / directions go live.',
      );
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Could not reach the admin maps API. Sign in as a platform admin with maps permissions and recent MFA.'));
    } finally {
      setBusy(false);
    }
  }, [fixtures]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (fixtures) {
      setMessage('Design fixtures enabled — save is disabled.');
      return;
    }
    if (!platformApiConfigured()) {
      setMessage('Configure NEXT_PUBLIC_FHC_API_URL to persist keys.');
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
      setMessage(`Saved ${provider}. Click Activate to make it live for web and mobile.`);
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Save failed. Confirm admin session, recent MFA, and platform.maps.manage.'));
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
      setMessage(`Active provider: ${data.active_provider}. Public clients will use this configuration.`);
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Activation failed. Google/Mapbox need a saved key; Leaflet works without one.'));
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
      setMessage(`Maps deactivated. Active provider projection: ${data.active_provider}.`);
    } catch (error) {
      setMessage(platformErrorMessage(error, 'Deactivation failed. Confirm admin session and platform.maps.manage.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card settings-card ministry-settings maps-settings" onSubmit={onSave}>
      <p className="maps-settings-lead">{message}</p>
      <div className="form-grid">
        <label className="full">
          <span>Active provider (pick any one)</span>
          <select value={provider} onChange={(event) => setProvider(event.target.value as MapsProvider)} disabled={busy}>
            <option value="leaflet">Leaflet / OpenStreetMap (no API key)</option>
            <option value="google">Google Maps</option>
            <option value="mapbox">Mapbox</option>
          </select>
        </label>
        <label className="full">
          <span>Google Maps API key {status.providers.google.key_configured ? '(saved)' : ''}</span>
          <input
            type="password"
            autoComplete="off"
            placeholder={status.providers.google.key_configured ? '•••••••• (leave blank to keep)' : 'Paste Google Maps browser key'}
            value={googleKey}
            onChange={(event) => setGoogleKey(event.target.value)}
            disabled={busy}
          />
        </label>
        <label className="full">
          <span>Mapbox access token {status.providers.mapbox.key_configured ? '(saved)' : ''}</span>
          <input
            type="password"
            autoComplete="off"
            placeholder={status.providers.mapbox.key_configured ? '•••••••• (leave blank to keep)' : 'Paste Mapbox public token'}
            value={mapboxToken}
            onChange={(event) => setMapboxToken(event.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          <span>Status</span>
          <input readOnly value={status.active ? `Active · ${status.active_provider}` : 'Inactive'} />
        </label>
        <label>
          <span>Configured</span>
          <input readOnly value={status.configured ? 'Yes' : 'No'} />
        </label>
      </div>
      <div className="form-footer">
        <button className="ghost-button" type="button" onClick={() => void refresh()} disabled={busy}>
          Refresh
        </button>
        <button className="ghost-button" type="button" onClick={() => void deactivate()} disabled={busy || fixtures}>
          Deactivate
        </button>
        <button className="ghost-button" type="button" onClick={() => void activate()} disabled={busy || fixtures}>
          Activate
        </button>
        <button className="primary-button" type="submit" disabled={busy || fixtures}>
          Save Provider
        </button>
      </div>
    </form>
  );
}
