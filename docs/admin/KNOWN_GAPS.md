# Known Gaps

This admin UI is no longer design-only. Overlays that collect privileged actions call
`executeAdminAction` (`lib/admin-mutation-dispatcher.ts`) and POST/PUT/PATCH/DELETE
against Laravel `/api/v1/admin/*` when a matching operation is registered. Identity
role assignment, scope assignment, and permission grants are live
(`assignAdminUserRole`, `assignAdminRoleAssignmentScope`, `grantAdminRolePermission`).
Unregistered actions still refuse fake success and may persist a local draft marker
only as an explicit miss.

These boundaries remain:

- Many list workspaces are still catalog-mapped GET reads
  (`lib/admin-catalog-api.ts` → `/admin/catalog/{domain}/{resource}`), not dedicated
  domain list/detail APIs. Fixture rows appear only when
  `FHC_ENABLE_DESIGN_FIXTURES` (or `NEXT_PUBLIC_FHC_ENABLE_DESIGN_FIXTURES`) is `true`.
- The public contact form has no inbox write API. With fixtures off it must not
  report delivered mail.
- Export, print, download, upload, and generated-document actions still need an
  authoritative file/delivery contract where Laravel does not already expose one.
  Public Press download and own-record member/admin file streams exist.
- Payments, outbound messaging, advisory AI, and live S3 stay fail-closed until
  providers are selected. Default payment governance denies; `local_manual` is QA-only.
- Production mail, Redis-on-this-host, live PSP/S3, and browser E2E are not proven.
  Dispatching a mutation to Laravel is not the same as a production-ready ministry
  platform.

Search, filter, pagination, tab workspaces, and module-return locations may still mix
live catalog/identity/platform data with session-only UI chrome. That is an integration
limit, not a claim that every screen is operationally complete.
