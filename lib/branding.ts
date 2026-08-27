export const DEFAULT_APP_NAME = 'Family House Connect';

export type PublicBranding = {
  app_name: string;
  logo_url: string | null;
  favicon_url: string | null;
};

export type AdminBranding = PublicBranding & {
  configured: boolean;
  configuration_revision: number;
  logo: {
    id: string;
    detected_mime_type?: string | null;
    byte_size?: number | null;
    original_filename?: string | null;
  } | null;
  favicon: {
    id: string;
    detected_mime_type?: string | null;
    byte_size?: number | null;
    original_filename?: string | null;
  } | null;
};

export const defaultPublicBranding = (): PublicBranding => ({
  app_name: DEFAULT_APP_NAME,
  logo_url: null,
  favicon_url: null,
});

function asBranding(data: unknown): PublicBranding {
  const row = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const appName = typeof row.app_name === 'string' && row.app_name.trim() ? row.app_name.trim() : DEFAULT_APP_NAME;
  return {
    app_name: appName,
    logo_url: typeof row.logo_url === 'string' && row.logo_url ? row.logo_url : null,
    favicon_url: typeof row.favicon_url === 'string' && row.favicon_url ? row.favicon_url : null,
  };
}

export async function loadPublicBranding(): Promise<PublicBranding> {
  const { isPublicApiConfigured, publicRequest } = await import('./public-api.ts');
  if (!isPublicApiConfigured()) return defaultPublicBranding();
  try {
    return asBranding(await publicRequest<PublicBranding>('branding'));
  } catch {
    return defaultPublicBranding();
  }
}

export function applyDocumentBranding(branding: PublicBranding): void {
  if (typeof document === 'undefined') return;
  const iconUrl = branding.favicon_url ?? branding.logo_url;
  if (!iconUrl) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = iconUrl;
  link.type = iconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
}
