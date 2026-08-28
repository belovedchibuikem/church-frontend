import { LOCALE_COOKIE, LOCALE_STORAGE_KEY } from './types.ts';
import { normalizeLocale } from './lookup.ts';
import type { SupportedLocale } from './types.ts';

function cookieExpires(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toUTCString();
}

export function readStoredLocale(): SupportedLocale | null {
  if (typeof document === 'undefined') return null;
  const fromCookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`));
  if (fromCookie) {
    return normalizeLocale(decodeURIComponent(fromCookie.slice(LOCALE_COOKIE.length + 1)));
  }
  try {
    const fromStorage = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (fromStorage) return normalizeLocale(fromStorage);
  } catch {
    /* private mode */
  }
  return null;
}

export function persistLocale(locale: SupportedLocale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; expires=${cookieExpires()}; SameSite=Lax`;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode */
  }
}

export function applyDocumentLocale(locale: SupportedLocale, direction: 'ltr' | 'rtl'): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = direction;
}
