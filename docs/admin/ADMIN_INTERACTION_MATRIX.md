# Admin Interaction Matrix

Frontend-only contract for the 258 screens cataloged in `ADMIN_ROUTE_MAP.md`. The shared shell derives permission and scope from `AdminScreen` metadata. `API` is intentionally `none` throughout this build.

| Surface | User action | Frontend result | URL/local state | Permission and scope | Server result |
| --- | --- | --- | --- | --- | --- |
| Login and MFA | Sign in / verify | Navigates `/admin/login` → `/admin/mfa` → `/admin` | Route | Public/self | None |
| Recovery / backup code | Open option | Shows integration guidance | Dialog | Public/self | Explicitly unavailable |
| Breadcrumbs and unified sidebar | Navigate | Opens any dashboard or module page directly from one persistent grouped hierarchy | Route plus retained `scope` | Destination metadata | None |
| Sidebar module groups | Expand/collapse | Opens the active group automatically, remembers manually opened groups, and scrolls the active child into view | `fhc-admin-nav-groups` | Current screen | None |
| Desktop/mobile navigation | Toggle | Collapses to a 72px icon rail or opens the 310px mobile drawer | `fhc-admin-sidebar` | Current screen | None |
| Header alerts/profile | Open | Routes to alerts/notifications or opens profile drawer | Route/drawer | Current screen | None |
| Scope selector | Select scope | Navigates and retains selected scope | `scope`, local preference | `organization.scope.select`/assigned | None |
| Tabs | Select tab | Activates matching visual tab and panel context | `tab` | Current screen metadata | None |
| Search | Type query | Filters fixture rows and exposes matching records | `q` | Current screen metadata | None |
| Filters | Apply/reset | Opens drawer and persists filter selection | `filter`, `status`, `date`, `sort` | Current screen metadata | None |
| Pagination | Previous/page/next | Changes displayed page state | `page` | Current screen metadata | None |
| Row view/open | Open record | Navigates to a canonical child or opens a record-specific detail drawer populated from that row | Route/drawer | Current screen metadata | None |
| Quick actions | Open known destination | Navigates through the canonical action registry | Route | Destination metadata | None |
| Back/cancel | Leave form/detail | Uses history with canonical parent fallback | Route | Current screen metadata | None |
| Save draft | Preserve local preview | Stores a timestamp and shows a toast | `fhc-admin-draft:<route>` | Current screen metadata | No server persistence |
| Create/add/new/edit | Open record form | Opens an entity-aware form (people, church, content, finance/request, or generic record); edit forms prefill available page details | Drawer | Current screen permission/scope | Local draft only; no fake success |
| Assign/distribute | Open assignment | Opens assignee, due-date and instructions controls | Drawer | Current screen permission/scope | Local draft only |
| Save/approve/reject/defer/activate/send | Review protected action | Opens scope/permission summary, visible record context, notes and acknowledgement | Modal | Current screen permission/scope | Review notes only; no fake success |
| Suspend/delete/escalate/refund/reconcile | Attempt high-risk mutation | Shows protected-workflow modal and disabled authorization control | Modal | Current screen permission/scope | Blocked; no fake success |
| Export/upload | Configure export | Opens format, date range and notes controls | Drawer | Current screen metadata | Export setup saved locally; no fake file |
| Download/print/PDF/receipt | Preview document request | Opens a designed document preview and delivery note | Drawer | Current screen metadata | Request saved locally; no fake file |
| AI prompt/suggestion | Compose AI request | Opens prompt suggestions and a full prompt field | Drawer | Current screen metadata | Prompt saved locally; no fabricated insight |
| All modules | Switch module | Opens 14 enterprise module cards and restores the last safe route/state for the selected module | Session state | Destination metadata | None |
| Cross-module return | Return to work | Adds a validated `returnTo` control and restores the originating module context | `returnTo` | Canonical routes only | None |
| Screen directory | Open a reference screen | Directly navigates to the selected canonical route | Route | Catalog metadata | None |

## Acceptance rules

- Every visible button must navigate, update URL/local UI state, open a meaningful drawer/dialog, or disclose that authoritative execution is unavailable.
- Every canonical navigation destination must exist in `lib/admin-routes.ts`.
- Restricted and mutation-capable screens may never display simulated approval, payment, safeguarding, privacy, or access-control success.
- Back/forward and refresh restore URL-backed tab, search, filter, pagination, and scope state.
