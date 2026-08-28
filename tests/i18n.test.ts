import assert from 'node:assert/strict';
import test from 'node:test';
import { messageCatalogs } from '../lib/i18n/catalogs.ts';
import { localeDirection, lookupMessage, normalizeLocale } from '../lib/i18n/lookup.ts';
import { supportedLocales, type MessageTree, type SupportedLocale } from '../lib/i18n/types.ts';

function collectKeys(tree: MessageTree, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [segment, value] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${segment}` : segment;
    if (typeof value === 'string') keys.push(key);
    else keys.push(...collectKeys(value, key));
  }
  return keys;
}

test('every supported locale has a catalog with the English key set', () => {
  const englishKeys = collectKeys(messageCatalogs.en).sort();
  assert.ok(englishKeys.includes('common.save'));
  assert.ok(englishKeys.includes('auth.chooseLanguage'));
  for (const locale of supportedLocales) {
    assert.deepEqual(collectKeys(messageCatalogs[locale]).sort(), englishKeys, locale);
  }
});

test('normalizeLocale maps regional Chinese and Arabic tags onto platform locales', () => {
  assert.equal(normalizeLocale('zh-CN'), 'zh');
  assert.equal(normalizeLocale('ar-SA'), 'ar');
});

test('lookup interpolates, falls back to English, and keeps Arabic RTL', () => {
  assert.equal(normalizeLocale('en-NG'), 'en');
  assert.equal(normalizeLocale('pt-BR'), 'en');
  assert.equal(localeDirection('ar'), 'rtl');
  assert.equal(localeDirection('yo'), 'ltr');
  assert.equal(
    lookupMessage(messageCatalogs, 'fr', 'common.continueWith', { vars: { language: 'Français' } }),
    'Continuer en Français',
  );
  assert.equal(lookupMessage(messageCatalogs, 'fr', 'common.save'), 'Enregistrer');
  assert.equal(
    lookupMessage(messageCatalogs, 'fr', 'missing.key', { defaultMessage: 'Fallback' }),
    'Fallback',
  );
});

test('authored catalogs are not English copies for core chrome', () => {
  const sampleKeys = ['common.save', 'nav.home', 'auth.signIn', 'onboarding.chooseLanguage'];
  for (const locale of supportedLocales.filter((item: SupportedLocale) => item !== 'en')) {
    for (const key of sampleKeys) {
      const translated = lookupMessage(messageCatalogs, locale, key);
      const english = lookupMessage(messageCatalogs, 'en', key);
      assert.notEqual(translated, english, `${locale} ${key}`);
      assert.notEqual(translated, key);
    }
  }
});

test('every locale catalog value for save, language copy, and tagline is authored', () => {
  const requiredKeys = ['common.save', 'auth.chooseLanguageCopy', 'footer.tagline'];
  for (const locale of supportedLocales) {
    const catalogKeys = new Set(collectKeys(messageCatalogs[locale]));
    for (const key of requiredKeys) {
      assert.ok(catalogKeys.has(key), `${locale} ${key}`);
      const value = lookupMessage(messageCatalogs, locale, key);
      assert.ok(value.trim() !== '', `${locale} ${key}`);
      assert.notEqual(value, key, `${locale} ${key}`);
    }
  }
});
