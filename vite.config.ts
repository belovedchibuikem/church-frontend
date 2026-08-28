import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import vinext from 'vinext';
import { defineConfig, loadEnv, searchForWorkspaceRoot, type Plugin } from 'vite';
import hostingConfig from './.openai/hosting.json';
import { laravelDevProxyOrigin } from './lib/laravel-dev-proxy';

const VINEXT_LINK_DYNAMIC_NAV = `			const { navigateClientSide } = await import("./navigation.js");
			const setter = setPendingRef.current;
			if (setter) setLinkForCurrentNavigation(setter);
			setPending(true);
			React.startTransition(() => {
				navigateClientSide(navigateHref, replace ? "replace" : "push", scroll, true).finally(() => {
					if (mountedRef.current) setPending(false);
					if (setter) clearLinkForCurrentNavigation(setter);
				});
			});`;

const VINEXT_LINK_RUNTIME_NAV = `			const runtimeNavigate = getNavigationRuntime()?.functions.navigate;
			const setter = setPendingRef.current;
			if (setter) setLinkForCurrentNavigation(setter);
			setPending(true);
			const historyMode = replace ? "replace" : "push";
			React.startTransition(() => {
				const finished = () => {
					if (mountedRef.current) setPending(false);
					if (setter) clearLinkForCurrentNavigation(setter);
				};
				getNavigationRuntime()?.functions.notifyLinkNavigationStart?.();
				if (typeof runtimeNavigate === "function") {
					Promise.resolve(runtimeNavigate(absoluteFullHref, 0, "navigate", historyMode, void 0, true)).finally(finished);
					return;
				}
				if (replace) window.location.replace(absoluteFullHref);
				else window.location.assign(absoluteFullHref);
				finished();
			});`;

/** Rolldown folds vinext's navigation.js into a shared chunk and does not
 *  re-export navigateClientSide / prefetch helpers. Link then dynamically
 *  imports missing names, so clicks throw and prefetch logs "is not a function".
 *  Use the already-registered runtime navigate, and skip RSC prefetch. */
function fixVinextLinkNavigation(): Plugin {
  return {
    name: 'fhc-fix-vinext-link-navigation',
    enforce: 'pre',
    transform(code, id) {
      const file = id.replace(/\\/g, '/').split('?')[0] ?? id;
      if (file.endsWith('/vinext/dist/shims/link.js')) {
        if (!code.includes(VINEXT_LINK_DYNAMIC_NAV)) {
          this.warn('vinext link.js click handler changed; client navigation patch was not applied');
          return null;
        }
        return { code: code.replace(VINEXT_LINK_DYNAMIC_NAV, VINEXT_LINK_RUNTIME_NAV), map: null };
      }
      if (file.endsWith('/vinext/dist/shims/link-prefetch.js')) {
        if (!code.includes('input.nodeEnv === "production" && input.prefetch !== false')) {
          return null;
        }
        return {
          code: code
            .replace(
              'return input.nodeEnv === "production" && input.prefetch !== false && !input.isDangerous;',
              'return false;',
            )
            .replace(
              'return input.routerMode === "pages" || input.prefetch !== false;',
              'return false;',
            ),
          map: null,
        };
      }
      return null;
    },
  };
}

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const generatedTypescriptClientDir = path.resolve(
  projectDir,
  '../../../../api/clients/typescript',
);

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/app-router-entry',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, projectDir, '');
  const laravelOrigin = laravelDevProxyOrigin(env.FHC_LARAVEL_API_URL);
  const apiProxy = {
    '/api': {
      target: laravelOrigin,
      changeOrigin: true,
      secure: false,
      cookieDomainRewrite: 'localhost',
      cookiePathRewrite: '/',
    },
  };

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  const isVercel =
    process.env.VERCEL === '1' || process.env.NITRO_PRESET === 'vercel';

  // Handle `@import "tailwindcss"` before Vite's PostCSS importer. Nitro's
  // RSC/SSR CSS pass otherwise treats it as a project-root file and fails.
  const plugins = [tailwindcss(), vinext(), fixVinextLinkNavigation()];

  if (isVercel) {
    const { nitro } = await import('nitro/vite');
    plugins.push(nitro());
  } else {
    plugins.push(sites());
    // Wrangler snapshots its log path while the Cloudflare plugin is imported.
    const { cloudflare } = await import('@cloudflare/vite-plugin');
    plugins.push(
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    );
  }

  return {
    server: {
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
      fs: {
        allow: [searchForWorkspaceRoot(projectDir), generatedTypescriptClientDir],
      },
      proxy: apiProxy,
    },
    preview: { proxy: apiProxy },
    plugins,
    build: {
      rolldownOptions: {
        output: {
          // Vinext Link dynamically imports named exports from next/navigation
          // (`navigateClientSide`, `getPrefetchInterceptionContext`). Rolldown
          // otherwise mangles those names on the shared client chunk while the
          // dynamic import still looks up the original names — production then
          // logs "[vinext] RSC prefetch setup error: m is not a function" and
          // clicks throw "e is not a function" inside startTransition.
          minifyInternalExports: false,
        },
      },
    },
    environments: {
      client: {
        build: {
          rolldownOptions: {
            output: {
              minifyInternalExports: false,
            },
          },
        },
      },
    },
  };
});
