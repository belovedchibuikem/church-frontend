'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { designFixturesEnabled, loadMapsBootstrap, publicErrorMessage } from '@/lib/site-api';

export type MapProvider = 'google' | 'mapbox' | 'leaflet';

export type MapMarker = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: string;
  href?: string;
};

export type MapsBootstrap = {
  active: boolean;
  provider: MapProvider;
  clientApiKey: string | null;
  tileUrl: string | null;
  defaultCenter: { latitude: number; longitude: number };
  defaultZoom: number;
};

export type InteractiveMapProps = {
  markers?: MapMarker[];
  mode?: 'explore' | 'directions';
  destination?: MapMarker | null;
  height?: number | string;
  className?: string;
  onMarkerSelect?: (marker: MapMarker) => void;
};

const LEAFLET_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const LEAFLET_FALLBACK: MapsBootstrap = {
  active: false,
  provider: 'leaflet',
  clientApiKey: null,
  tileUrl: LEAFLET_TILES,
  defaultCenter: { latitude: 6.5244, longitude: 3.3792 },
  defaultZoom: 12,
};

const MAPS_UNAVAILABLE =
  'Maps are unavailable. An administrator must activate a maps provider in Platform Settings.';

declare global {
  interface Window {
    google?: any;
    L?: any;
    mapboxgl?: any;
  }
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function loadStylesheet(href: string, id: string): void {
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function resolveProvider(config: MapsBootstrap): MapProvider | null {
  if (config.provider === 'google') return config.clientApiKey ? 'google' : null;
  if (config.provider === 'mapbox') return config.clientApiKey ? 'mapbox' : null;
  if (config.provider === 'leaflet') return 'leaflet';
  return null;
}

export function InteractiveMap({
  markers: markersProp,
  mode = 'explore',
  destination = null,
  height = 420,
  className = '',
  onMarkerSelect,
}: InteractiveMapProps) {
  const { t } = useLocale();
  const hostId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const providerRef = useRef<MapProvider | null>(null);
  const destRef = useRef<MapMarker | null>(null);
  const configRef = useRef<MapsBootstrap>(LEAFLET_FALLBACK);
  const mapsUnavailable = t('maps.unavailable', {
    defaultMessage: 'Maps are unavailable. An administrator must activate a maps provider in Platform Settings.',
  });
  const [status, setStatus] = useState(() => t('maps.loading', { defaultMessage: 'Loading map…' }));
  const [unavailable, setUnavailable] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState(() => t('maps.providerFallback', { defaultMessage: 'Maps' }));
  const [emptyPlaces, setEmptyPlaces] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setStatus(t('common.loadingMap', { defaultMessage: 'Loading map…' }));
      setUnavailable(false);
      setEmptyPlaces(false);
      setRouteInfo(null);
      providerRef.current = null;
      destRef.current = null;

      let config = LEAFLET_FALLBACK;
      let remoteMarkers: MapMarker[] = [];
      let source: 'api' | 'fixtures' = 'api';

      try {
        const bootstrap = await loadMapsBootstrap({ type: 'all', limit: 100 });
        if (cancelled) return;
        config = bootstrap.config;
        remoteMarkers = bootstrap.markers;
        source = bootstrap.source;
      } catch (error) {
        if (cancelled) return;
        if (!designFixturesEnabled()) {
          setUnavailable(true);
          setStatus(publicErrorMessage(error, mapsUnavailable));
          return;
        }
        config = { ...LEAFLET_FALLBACK, active: true };
        source = 'fixtures';
      }

      const fixtures = designFixturesEnabled() || source === 'fixtures';

      // Production: inactive provider → clear unavailable (never invent pins or vendor keys).
      if (!config.active && !fixtures) {
        setUnavailable(true);
        setStatus(mapsUnavailable);
        setProviderLabel(t('common.inactive', { defaultMessage: 'Inactive' }));
        return;
      }

      // Design fixtures may preview Leaflet even when the live provider is inactive.
      if (!config.active && fixtures) {
        config = { ...LEAFLET_FALLBACK, active: true };
      }

      const markers = markersProp?.length ? markersProp : remoteMarkers;
      setEmptyPlaces(!markers.length);
      const dest = destination ?? (mode === 'directions' ? markers[0] ?? null : null);
      destRef.current = dest;
      configRef.current = config;

      const resolvedProvider = resolveProvider(config);
      if (!resolvedProvider) {
        setUnavailable(true);
        setStatus(
          config.provider === 'google' || config.provider === 'mapbox'
            ? t('errors.mapsProviderMissingClientKey', {
                defaultMessage: 'The {provider} provider is active but no client key was returned by the API.',
                vars: { provider: config.provider },
              })
            : mapsUnavailable,
        );
        setProviderLabel(t('common.unavailable', { defaultMessage: 'Unavailable' }));
        return;
      }

      providerRef.current = resolvedProvider;
      setProviderLabel(
        resolvedProvider === 'google'
          ? t('common.googleMaps', { defaultMessage: 'Google Maps' })
          : resolvedProvider === 'mapbox'
            ? t('common.mapbox', { defaultMessage: 'Mapbox' })
            : t('common.leafletOsm', { defaultMessage: 'Leaflet / OpenStreetMap' }),
      );

      try {
        if (resolvedProvider === 'google') {
          await renderGoogle(config, markers, dest);
        } else if (resolvedProvider === 'mapbox') {
          await renderMapbox(config, markers, dest);
        } else {
          await renderLeaflet(
            {
              ...config,
              provider: 'leaflet',
              tileUrl: config.tileUrl || LEAFLET_TILES,
            },
            markers,
            dest,
          );
        }
        if (!cancelled) setStatus('');
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setUnavailable(true);
          setStatus(publicErrorMessage(error, 'Unable to render the active maps provider.'));
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
      if (mapRef.current?.remove) mapRef.current.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersProp, mode, destination?.id]);

  useEffect(() => {
    if (mode !== 'directions' || !userLocation || unavailable) return;
    const dest = destRef.current;
    const provider = providerRef.current;
    const map = mapRef.current;
    if (!dest || !provider || !map) return;

    void (async () => {
      try {
        if (provider === 'leaflet' && window.L) {
          await drawOsrmRoute(map, window.L, userLocation, dest);
        } else if (provider === 'google' && window.google) {
          const directionsService = new window.google.maps.DirectionsService();
          const directionsRenderer = new window.google.maps.DirectionsRenderer({ map });
          directionsService.route(
            {
              origin: { lat: userLocation.latitude, lng: userLocation.longitude },
              destination: { lat: dest.latitude, lng: dest.longitude },
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result: any, statusCode: string) => {
              if (statusCode === 'OK' && result) {
                directionsRenderer.setDirections(result);
                const leg = result.routes?.[0]?.legs?.[0];
                if (leg) setRouteInfo(`${leg.duration.text} · ${leg.distance.text}`);
              }
            },
          );
        } else if (provider === 'mapbox' && configRef.current.clientApiKey) {
          await drawMapboxRoute(map, configRef.current.clientApiKey, userLocation, dest);
        }
      } catch (error) {
        console.error(error);
        setStatus('Unable to build directions from your location.');
      }
    })();
  }, [userLocation, mode, unavailable]);

  async function renderLeaflet(config: MapsBootstrap, markers: MapMarker[], dest: MapMarker | null) {
    loadStylesheet('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leaflet-css');
    await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'leaflet-js');
    if (!containerRef.current || !window.L) return;

    const L = window.L;
    if (mapRef.current?.remove) mapRef.current.remove();

    const center = dest
      ? [dest.latitude, dest.longitude]
      : [config.defaultCenter.latitude, config.defaultCenter.longitude];
    const map = L.map(containerRef.current).setView(center, config.defaultZoom);
    mapRef.current = map;

    L.tileLayer(config.tileUrl || LEAFLET_TILES, {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    markers.forEach((marker) => {
      const pin = L.marker([marker.latitude, marker.longitude]).addTo(map);
      pin.bindPopup(`<strong>${marker.name}</strong>`);
      pin.on('click', () => onMarkerSelect?.(marker));
    });

    if (mode === 'directions' && dest && userLocation) {
      await drawOsrmRoute(map, L, userLocation, dest);
    }
  }

  async function renderGoogle(config: MapsBootstrap, markers: MapMarker[], dest: MapMarker | null) {
    if (!config.clientApiKey) throw new Error('Google Maps client key missing from bootstrap.');
    await loadScript(
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.clientApiKey)}&libraries=places`,
      'google-maps-js',
    );
    if (!containerRef.current || !window.google) return;

    const center = dest
      ? { lat: dest.latitude, lng: dest.longitude }
      : { lat: config.defaultCenter.latitude, lng: config.defaultCenter.longitude };

    const map = new window.google.maps.Map(containerRef.current, {
      center,
      zoom: config.defaultZoom,
      mapTypeControl: false,
      streetViewControl: false,
    });
    mapRef.current = map;

    markers.forEach((marker) => {
      const pin = new window.google.maps.Marker({
        map,
        position: { lat: marker.latitude, lng: marker.longitude },
        title: marker.name,
      });
      pin.addListener('click', () => onMarkerSelect?.(marker));
    });

    if (mode === 'directions' && dest && userLocation) {
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({ map });
      directionsService.route(
        {
          origin: { lat: userLocation.latitude, lng: userLocation.longitude },
          destination: { lat: dest.latitude, lng: dest.longitude },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result: any, statusCode: string) => {
          if (statusCode === 'OK' && result) {
            directionsRenderer.setDirections(result);
            const leg = result.routes?.[0]?.legs?.[0];
            if (leg) setRouteInfo(`${leg.duration.text} · ${leg.distance.text}`);
          }
        },
      );
    }
  }

  async function renderMapbox(config: MapsBootstrap, markers: MapMarker[], dest: MapMarker | null) {
    if (!config.clientApiKey) throw new Error('Mapbox access token missing from bootstrap.');
    loadStylesheet('https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css', 'mapbox-css');
    await loadScript('https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js', 'mapbox-js');
    if (!containerRef.current || !window.mapboxgl) return;

    window.mapboxgl.accessToken = config.clientApiKey;
    if (mapRef.current?.remove) mapRef.current.remove();

    const center: [number, number] = dest
      ? [dest.longitude, dest.latitude]
      : [config.defaultCenter.longitude, config.defaultCenter.latitude];

    const map = new window.mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: config.defaultZoom,
    });
    map.addControl(new window.mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    markers.forEach((marker) => {
      const el = document.createElement('button');
      el.className = 'map-pin';
      el.type = 'button';
      el.title = marker.name;
      el.addEventListener('click', () => onMarkerSelect?.(marker));
      new window.mapboxgl.Marker(el)
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(new window.mapboxgl.Popup().setHTML(`<strong>${marker.name}</strong>`))
        .addTo(map);
    });

    if (mode === 'directions' && dest && userLocation) {
      await drawMapboxRoute(map, config.clientApiKey, userLocation, dest);
    }
  }

  async function drawMapboxRoute(
    map: any,
    token: string,
    from: { latitude: number; longitude: number },
    dest: MapMarker,
  ) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${dest.longitude},${dest.latitude}?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;
    const response = await fetch(url);
    const payload = (await response.json()) as {
      routes?: Array<{ geometry: unknown; duration: number; distance: number }>;
    };
    const route = payload.routes?.[0];
    if (!route) return;

    const apply = () => {
      if (map.getSource?.('route')) {
        map.removeLayer('route');
        map.removeSource('route');
      }
      map.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: route.geometry } });
      map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#0f6b4c', 'line-width': 5 } });
    };

    if (map.isStyleLoaded?.()) apply();
    else map.on('load', apply);

    setRouteInfo(`${Math.round(route.duration / 60)} min · ${(route.distance / 1000).toFixed(1)} km`);
  }

  async function drawOsrmRoute(map: any, L: any, from: { latitude: number; longitude: number }, dest: MapMarker) {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const payload = (await response.json()) as {
      routes?: Array<{ geometry: { coordinates: [number, number][] }; duration: number; distance: number }>;
    };
    const route = payload.routes?.[0];
    if (!route) return;
    const coords = route.geometry.coordinates.map((pair) => [pair[1], pair[0]]);
    L.polyline(coords, { color: '#0f6b4c', weight: 5 }).addTo(map);
    map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
    setRouteInfo(`${Math.round(route.duration / 60)} min · ${(route.distance / 1000).toFixed(1)} km`);
  }

  function useMyLocation() {
    if (unavailable) {
      setStatus(MAPS_UNAVAILABLE);
      return;
    }
    if (!navigator.geolocation) {
      setStatus('Geolocation is not available in this browser.');
      return;
    }
    setStatus('Locating…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setUserLocation(next);
        setStatus('');
        const map = mapRef.current;
        if (map?.setView) map.setView([next.latitude, next.longitude], 14);
        if (map?.flyTo) map.flyTo({ center: [next.longitude, next.latitude], zoom: 14 });
        if (map?.panTo && window.google) map.panTo({ lat: next.latitude, lng: next.longitude });
      },
      () => setStatus('Unable to access your location. Check browser permissions.'),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <div className={`interactive-map ${unavailable ? 'is-unavailable' : ''} ${className}`.trim()}>
      <div className="interactive-map-toolbar">
        <button type="button" className="site-button secondary" onClick={useMyLocation} disabled={unavailable}>
          Use my location
        </button>
        <span className="map-provider-chip">{providerLabel}</span>
        {routeInfo ? <span className="map-route-chip">{routeInfo}</span> : null}
      </div>
      {status ? <p className={`map-status ${unavailable ? 'map-unavailable' : ''}`}>{status}</p> : null}
      {!status && !unavailable && emptyPlaces ? <p className="map-status">No mapped places are published yet.</p> : null}
      {!unavailable ? (
        <div
          id={`map-host-${hostId}`}
          ref={containerRef}
          className="interactive-map-canvas"
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        />
      ) : (
        <div
          className="interactive-map-canvas map-unavailable-canvas"
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
          role="status"
        >
          <p>Map unavailable</p>
        </div>
      )}
    </div>
  );
}
