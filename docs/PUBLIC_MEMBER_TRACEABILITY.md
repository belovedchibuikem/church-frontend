# Public and member implementation traceability

The ten approved public/member contact sheets in `docs/users/` are implemented through the canonical catalogue in `lib/site-routes.ts`. Routes render through the shared public header, authentication/workflow shell, member sidebar, page templates, and interaction layer in `components/site-ui.tsx`.

| Reference family | Canonical entries | Access |
| --- | --- | --- |
| Public brand and discovery | `/`, `/about`, `/vision`, `/church`, `/find-church`, `/contact`, `/faq`, `/search` | Public |
| Authentication and onboarding | `/login`, `/register`, `/verify-email`, `/otp`, `/onboarding/*` | Public/auth flow |
| Member account and settings | `/account`, `/account/journey`, `/account/settings/*` | Authenticated member |
| Start a Home Church | `/start-home-church`, `/start-home-church/apply/*` | Public workflow; member tracking is protected |
| Events, prayer, and giving | `/events/*`, `/prayer/*`, `/give/*`, `/account/giving/*` | Public workflow; history is protected |
| Church discovery and joining | `/find-church/*`, `/churches/*`, `/join-church/*` | Public |
| KCA | `/kca/*`, `/account/kca/*` | Public application; student records are protected |
| Mission | `/mission/*` | Public and public workflows |
| Online Church | `/online-church/*` | Public |

No Laravel or API implementation was added. Form actions are safe frontend prototypes and do not claim production persistence. Authentication and production data contracts remain integration dependencies.
