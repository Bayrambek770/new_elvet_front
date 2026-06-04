# CLAUDE.md — ELVET Frontend

## Project Overview

React 18 + TypeScript + Vite frontend for **Elvet Clinic** — a veterinary clinic management system.
React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · TanStack Query · React Router v6 · i18next · Axios

---

## Commands

```bash
cd /var/www/ELVET/front
npm install
npm run dev         # Dev server → http://localhost:8080
npm run build       # TypeScript check + Vite build → dist/
npm run lint        # ESLint
npm run preview     # Preview production build locally
```

### Production deployment

```bash
npm run build                            # Build into dist/
# dist/ is served directly by nginx at https://elvet.test-for-test.uz
# No extra copy step needed — nginx root points to /var/www/ELVET/front/dist/
```

---

## Environment Variables (`.env`)

```env
VITE_API_BASE=https://admin.elvet.test-for-test.uz/api/v1/
VITE_LOGOUT_REDIRECT=/auth
VITE_ADMIN_SHOULD_BE_REDIRECTED=None
```

- All frontend env vars **must** be prefixed with `VITE_`
- `VITE_API_BASE` must include the trailing slash and `/api/v1/`
- `.env` is gitignored — never commit it

---

## Project Structure

```
src/
├── App.tsx                  # Root router — all routes defined here
├── main.tsx                 # React entry point, i18n init
├── index.css                # Tailwind base + global styles
├── lib/
│   ├── apiClient.ts         # Axios instance, JWT interceptors (auto-refresh), token storage
│   ├── api.ts               # Typed API functions grouped by domain (Auth, Clients, MedicalCards, …)
│   └── utils.ts             # cn() helper (clsx + tailwind-merge)
├── hooks/
│   ├── api.ts               # TanStack Query hooks (useLogin, useMedicalCards, …)
│   └── use-mobile.tsx       # Responsive hook
├── pages/
│   ├── Landing.tsx          # Public landing page
│   ├── Auth.tsx             # Login / registration page
│   ├── AdminSetup.tsx       # First-time admin setup
│   └── dashboard/
│       ├── AdminDashboard.tsx
│       ├── ModeratorDashboard.tsx
│       ├── DoctorDashboard.tsx
│       ├── NurseDashboard.tsx
│       └── ClientDashboard.tsx
├── components/
│   ├── ProtectedRoute.tsx   # Wraps role-gated routes
│   ├── LanguageSwitcher.tsx # ru/uz/en switcher
│   ├── ui/                  # shadcn/ui primitives (Button, Dialog, Table, …)
│   ├── landing/             # Landing page sections (Hero, About, Services, …)
│   ├── admin/               # Admin-specific components
│   ├── moderator/           # Moderator dashboard components
│   ├── doctor/              # Doctor dashboard components
│   ├── nurse/               # Nurse dashboard components
│   └── client/              # Client dashboard components
├── i18n/
│   ├── config.ts            # i18next setup — fallback lang: Russian
│   └── locales/             # ru.ts, uz.ts, en.ts
└── integrations/
    └── supabase/            # Supabase client (legacy/unused — ignore for new features)
```

---

## Routing & Auth

Routes are defined in `src/App.tsx`. All dashboard routes are wrapped in `<ProtectedRoute>`:

```
/                   → Landing (public)
/auth               → Auth / Login (public)
/admin-setup        → AdminSetup (public)
/dashboard/admin    → AdminDashboard (protected)
/dashboard/moderator→ ModeratorDashboard (protected)
/dashboard/doctor   → DoctorDashboard (protected)
/dashboard/nurse    → NurseDashboard (protected)
/dashboard/client   → ClientDashboard (protected)
```

After login, the app reads the user's `role` from the JWT response and redirects to the correct dashboard.

---

## API Layer

### `src/lib/apiClient.ts`

- Axios instance with `baseURL = VITE_API_BASE`
- **Request interceptor:** attaches `Authorization: Bearer <access_token>` from `localStorage`
- **Response interceptor:** on 401, silently attempts token refresh via `/auth/jwt/refresh/`; queues concurrent requests during refresh; redirects to `/auth` on failure
- Token keys in localStorage: `access_token`, `refresh_token`, `user_role`

### `src/lib/api.ts`

Typed API modules — import these, not raw axios:

```ts
Auth.login({ phone_number, password })
Auth.refresh(refreshToken)
Me.get()                   // GET /me/ — current user profile
Clients.list()
MedicalCards.list()
MedicalCards.create(data)
Payments.create(data)
NurseCareCards.list()
Tasks.list()
// … and more
```

### `src/hooks/api.ts`

TanStack Query hooks wrapping the api.ts functions. Prefer these in components:

```ts
useLogin()
useMedicalCards()
useNurseCareCards()
useTasks()
// mutations: useCreateMedicalCard(), useUpdatePayment(), …
```

---

## State Management

No global state store (no Redux/Zustand). State is managed via:
- **TanStack Query** — all server state (fetching, caching, invalidation)
- **React local state** (`useState`) — UI state within components
- **localStorage** — auth tokens only

---

## i18n

- Library: `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- Fallback language: **Russian** (`ru`)
- Supported: `ru`, `uz`, `en`
- Translation files: `src/i18n/locales/{ru,uz,en}.ts`
- Usage: `const { t } = useTranslation(); t('key')`

---

## UI Components

- **shadcn/ui** primitives in `src/components/ui/` — do not modify these directly; regenerate via `npx shadcn-ui@latest add <component>`
- **Tailwind CSS** — all styling via utility classes; config in `tailwind.config.ts`
- **Path alias:** `@/` maps to `src/` — use it everywhere instead of relative paths

---

## Roles

The backend defines five roles. Each maps to a dashboard route and a set of visible components:

| Role | Dashboard route | Key capabilities |
|------|----------------|-----------------|
| `ADMIN` | `/dashboard/admin` | Full access, staff account creation, statistics |
| `MODERATOR` | `/dashboard/moderator` | Client registration, medical cards, salary dashboard, requests |
| `DOCTOR` | `/dashboard/doctor` | Own medical cards, service management, schedules |
| `NURSE` | `/dashboard/nurse` | Nurse care cards, task management, hospitalization |
| `CLIENT` | `/dashboard/client` | Own pets, own medical cards, appointments, profile |

---

## Production Deployment

| Item | Value |
|------|-------|
| Domain | `https://elvet.test-for-test.uz` |
| Build output | `/var/www/ELVET/front/dist/` |
| Nginx config | `/etc/nginx/sites-available/elvet/frontend.conf` |
| SSL | Let's Encrypt (expires 2026-09-02, auto-renews) |
| Backend URL | `https://admin.elvet.test-for-test.uz/api/v1/` |

After code changes: `npm run build` — nginx serves the new `dist/` immediately, no service restart needed.

---

## Key Patterns

- All API calls go through `src/lib/api.ts` functions — never use raw `axios` or `fetch` directly in components
- Use TanStack Query hooks from `src/hooks/api.ts` for data fetching in components
- Use `@/` alias for all imports — no `../../../` relative paths
- shadcn/ui components in `src/components/ui/` are auto-generated — extend them via `className` prop, not edits
- `dist/` and `.env` are gitignored — never commit them
