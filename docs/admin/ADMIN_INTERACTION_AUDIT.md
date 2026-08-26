# Admin Interaction Audit

Scope: frontend-only static admin prototype. Audited against the 258 entries in `lib/admin-routes.ts` and the shared renderers in `components/admin-ui.tsx`, `components/kca-ui.tsx`, `components/mission-ui.tsx`, and `components/platform-ui.tsx`.

Backend operations are intentionally out of scope. A mutation that needs an API must never display fake success; it must expose a clear integration-unavailable state.

## Final integration status

| Severity | Module/page surface | Component/pattern | Visible interaction | Current behavior | Canonical frontend contract | Permission/scope source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Critical | All modules | Shared buttons | Create, edit, save, approve, reject, assign, suspend, delete | Shared interaction shell identifies the control and blocks server execution | Open confirmation/detail overlay; explain that server execution is unavailable in this frontend prototype | `AdminScreen.permission` / `AdminScreen.scope` | Complete |
| High | Login | `AuthView` | Forgot password | Opens recovery guidance without a fake email result | Open recovery guidance dialog without claiming an email was sent | Public/self | Complete |
| High | Login/MFA | `AuthView` | Sign in, verify code, backup code | Designed route flow works; unsupported recovery choices are disclosed | Preserve `/admin/login` → `/admin/mfa` → `/admin` | Public/self | Complete |
| High | All nested pages | Page shell | Breadcrumbs | Canonical linked ancestry is rendered | Generate linked breadcrumbs from route ancestry | Route metadata | Complete |
| High | All tabbed pages | Shared tabs | Overview and related tabs | Active tab is URL-backed and restores through history | Store active tab in `?tab=` | Current screen permission/scope | Complete |
| High | All collections | Shared table renderers | View row | Navigates to a canonical child or opens scoped quick view | Resolve a canonical detail route when one exists | Current screen permission/scope | Complete |
| High | All collections | Shared filter bars | Filter controls | Reusable filter drawer commits URL state | Preserve `filter`, `status`, `date`, and `sort` | Current screen permission/scope | Complete |
| High | All collections | Shared search inputs | Search | Fixture rows filter and `q` is preserved | Filter current fixture rows and preserve `q` | Current screen permission/scope | Complete |
| High | All collections | Shared pagination | Previous, page number, next | `page` is URL-backed; invalid previous is reported | Preserve `page` | Current screen permission/scope | Complete |
| High | Dashboards | Metric/summary cards | Drill-down | Canonical quick actions route; decorative charts stay non-interactive | Route only meaningful affordances | Destination route metadata | Complete |
| High | Dashboards | Quick actions | Create/review/report/settings shortcuts | Canonical destinations navigate; mutations disclose unavailable execution | Use canonical action registry | Destination route metadata | Complete |
| High | Notifications/alerts | Feed rows | Open notification/alert | Header routes to queues; row controls use safe preview/action handling | Never fabricate protected detail data | Destination route metadata | Complete |
| High | Global scope | Scope cards | Change scope | Scope is retained in URL and local preference | Persist `scope` during admin navigation | `organization.scope.select`/assigned | Complete |
| High | Sidebar | `Sidebar` | Unified module navigation | One persistent 14-group enterprise sidebar exposes dashboards, operations, every module, consolidated reports, security, and settings | Canonical grouped navigation with active-group expansion | Destination route metadata | Complete |
| High | Sidebar | `Sidebar` | Collapse/mobile navigation | Desktop collapses to a 72px icon rail; selecting a group expands it, mobile uses a 310px off-canvas drawer, and the active child scrolls into view | Responsive and remembered navigation state | Current route metadata | Complete |
| Medium | Header | More/options and alert icons | Menus/notifications | Routes or opens the reusable scoped action drawer | Meaningful header response | Current route metadata | Complete |
| Medium | Forms | Shared form renderers | Cancel/back | Uses history with canonical parent fallback | Safe parent navigation | Current route metadata | Complete |
| Medium | Reports/assets/documents | Download/export/print | File action | Explicit unavailable dialog; no fake file is produced | Wait for a real file/API contract | Current route metadata | Complete |
| Medium | AI screens | Prompt submit and suggestion chips | AI action | Explicit frontend-only unavailable response | Never invent AI execution | Current route metadata | Complete |
| Medium | Settings | Toggles/save | Settings controls | Local controls remain preview-only; save explains server requirement | No fake persistence | Current route metadata | Complete |
| Medium | Restricted records | Detail/action buttons | Open/act | Warning remains visible and privileged actions cannot succeed locally | Preserve restrictions | Restricted permission/assigned scope | Complete |
| Low | Screen directory | Catalog cards | Open screen | Functional | Keep canonical links and dynamic counts | Public directory | Complete |
| Low | Sidebar | Primary module links | Navigate | Functional | Keep canonical links and one active item | Route metadata | Complete |
| Low | Direct routes | Dynamic catch-all | Refresh/deep link | Functional | Keep server-side route lookup and access evaluation | Route metadata | Complete |

## Final source scan summary

- No `href="#"` or `javascript:void` placeholder links remain.
- All rendered admin screens are wrapped by `AdminInteractionShell`; central event handling covers shared-renderer controls without duplicating bespoke callbacks.
- Route authorization metadata exists for all 258 screens.
- Direct route rendering, permission checks, scope checks, and public-route limits already have automated coverage.
- There is no frontend API contract capable of authoritatively executing mutations; mutation controls therefore stop at disclosed unavailable states.

## Completed criteria for this frontend phase

- No placeholder links.
- Every button produces navigation, URL state, a meaningful overlay, a local preference change, or a disabled/unavailable explanation.
- Tabs, search, filters, pagination, sidebar state, breadcrumbs, browser back/forward, and deep routes work without a backend.
- No simulated approval, payment, safeguarding, access-control, or other privileged success.
