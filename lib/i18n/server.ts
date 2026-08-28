import { cookies } from 'next/headers';
import { LOCALE_COOKIE, type SupportedLocale } from './types.ts';
import { normalizeLocale } from './lookup.ts';

export async function readRequestLocale(): Promise<SupportedLocale> {
  try {
    const store = await cookies();
    return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  } catch {
    return normalizeLocale(undefined);
  }
}
