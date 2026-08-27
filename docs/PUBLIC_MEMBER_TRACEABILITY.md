# Public and member implementation traceability

The ten approved public/member contact sheets in `frontend/docs/users/` are implemented through the canonical catalogue in `lib/site-routes.ts`, realistic content fixtures in `lib/site-content.ts`, and the shared renderers in `components/site-ui.tsx`.

| Reference family | Canonical entries | Access |
| --- | --- | --- |
| Public brand and discovery | `/`, `/about`, `/vision`, `/church`, `/find-church`, `/contact`, `/faq`, `/search` | Public |
| Authentication and onboarding | `/login` (Sign In / Create Account tabs), `/register` → personal/contact/security/about/review, `/verify-email`, `/verify-phone`, `/otp`, `/forgot-password`, `/reset-password`, `/mfa/setup`, `/account-recovery`, `/onboarding/language|location|profile|role` | Public/auth flow |
| Member account and settings | `/account`, `/account/journey`, `/account/settings/*` | Authenticated member |
| Start a Home Church | `/start-home-church`, `/start-home-church/apply/*` | Public workflow; member tracking is protected |
| Events, prayer, and giving | `/events` hub (Upcoming/My/Past), event detail→register→checkout→ticket→feedback, `/account/events`, `/account/calendar`, `/prayer/*`, `/give/*` | Public workflow; member calendar/history protected |
| Church discovery and joining | `/find-church/*`, `/churches/*`, `/join-church/*` | Public |
| KCA | `/kca/gate`, enrol 8-step apply, `/account/kca` dashboard, modules, assignments, mentor, attendance, certificates | Public application; student records are protected |
| Mission | `/mission/*` | Public and public workflows |
| Online Church | `/online-church/*` | Public |

Visual approach: public/member pages keep the existing Family House purple shell and elevate each surface with route-aware copy, maps, discovery cards, auth split layouts, FAQ/search, church profiles, media schedules, and member dashboards drawn from the approved contact sheets.

No Laravel or API implementation was added. Form actions are safe frontend prototypes and do not claim production persistence. Authentication and production data contracts remain integration dependencies.
