import {
  DEFAULT_LOCALE,
  localeMeta,
  supportedLocales,
  type MessageTree,
  type MessageValue,
  type SupportedLocale,
  type TranslateOptions,
  type TranslateVars,
} from './types.ts';

export function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
}

/** Map BCP 47 tags (`en-NG`, `zh-Hans`) onto the eight platform locales. */
export function normalizeLocale(value: string | null | undefined): SupportedLocale {
  if (!value) return DEFAULT_LOCALE;
  const trimmed = value.trim().replace(/_/g, '-');
  if (!trimmed) return DEFAULT_LOCALE;
  const lower = trimmed.toLowerCase();
  if (isSupportedLocale(lower)) return lower;
  const primary = lower.split('-')[0] ?? lower;
  if (isSupportedLocale(primary)) return primary;
  return DEFAULT_LOCALE;
}

export function localeDirection(locale: string): 'ltr' | 'rtl' {
  return localeMeta[normalizeLocale(locale)].direction;
}

export function localeEndonym(locale: string): string {
  return localeMeta[normalizeLocale(locale)].endonym;
}

function readPath(tree: MessageTree | undefined, path: string[]): MessageValue | undefined {
  let current: MessageValue | undefined = tree;
  for (const segment of path) {
    if (!current || typeof current === 'string') return undefined;
    current = current[segment];
  }
  return current;
}

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value == null ? match : String(value);
  });
}

function resolvePlural(node: MessageTree, count: number): string | undefined {
  const exact = node[String(count)];
  if (typeof exact === 'string') return exact;
  if (count === 1 && typeof node.one === 'string') return node.one;
  if (typeof node.other === 'string') return node.other;
  return undefined;
}

export function lookupMessage(
  catalogs: Record<SupportedLocale, MessageTree>,
  locale: string,
  key: string,
  options: TranslateOptions = {},
): string {
  const resolved = normalizeLocale(locale);
  const path = key.split('.').filter(Boolean);
  const fromLocale = readPath(catalogs[resolved], path);
  const fromFallback = resolved === DEFAULT_LOCALE ? undefined : readPath(catalogs[DEFAULT_LOCALE], path);
  const node = fromLocale ?? fromFallback;

  let template: string | undefined;
  if (typeof node === 'string') {
    template = node;
  } else if (node && options.count != null) {
    template = resolvePlural(node, options.count);
  }

  if (template == null) {
    template = options.defaultMessage ?? key;
  }

  return interpolate(template, options.vars ?? (options.count != null ? { count: options.count } : undefined));
}
