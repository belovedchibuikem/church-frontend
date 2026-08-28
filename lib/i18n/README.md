# UI catalogs (web + mobile)

English (`messages/en.ts`) is the **approved source catalog**. Other locale files are **authored UI translations**, not machine-substituted dumps. Keep the same key tree in every file.

**Stay in English:** product names **Family House Connect** and **KCA**.

These catalogs cover chrome, forms, nav, and empty/error copy. **CMS and article bodies are not translated here** — they come from content, not this tree.

Locales: `en`, `yo`, `ig`, `ha`, `fr`, `ar`, `zh`, `sw`.

## Add a key

1. Add the string to `messages/en.ts`.
2. Add the same key to every other locale under `messages/`.
3. From the **repo root**, regenerate the Flutter catalog:

```bash
node --experimental-strip-types scripts/generate-l10n-catalogs.mjs
```

That writes `mobile/lib/core/l10n/catalogs.g.dart`. Do not edit the generated file.

## Usage

- **Web:** `const { t } = useLocale();` then `t('common.save')`.
- **Mobile:** `fhcT(context, 'common.save')`.
