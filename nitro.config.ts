import { defineNitroConfig } from 'nitro/config';
import { laravelDevProxyOrigin } from './lib/laravel-dev-proxy';

/**
 * Production BFF: browser calls same-origin `/api/v1` (see preferSameOriginBrowserApi).
 * Nitro/Vercel proxies those requests to Laravel so session cookies stay on the site origin.
 *
 * Requires FHC_LARAVEL_API_URL at build time (Vercel project env).
 */
const apiV1 = process.env.FHC_LARAVEL_API_URL?.trim();
const laravelOrigin = apiV1 ? laravelDevProxyOrigin(apiV1) : null;

export default defineNitroConfig({
  routeRules:
    laravelOrigin && apiV1
      ? {
          '/api/**': {
            proxy: `${laravelOrigin}/api/**`,
          },
        }
      : {},
});
