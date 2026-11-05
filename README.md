# Mela

MELA is an Ethiopian-first small business management application — a mobile-first, installable PWA for retail, food & beverage, bakery, and service businesses. It helps owners manage sales, inventory, and insights, with English and Amharic interfaces and Ethiopian Birr (ETB) currency.

## Stack

- **React + Vite + TypeScript** — fast, type-safe SPA foundation.
- **Tailwind CSS (v3)** — token-driven styling; design tokens live as CSS variables in `src/index.css` and are mapped in `tailwind.config.ts`.
- **Supabase + PostgreSQL** — backend (auth + database). This phase sets up a typed client and env handling only; no queries are implemented yet.
- **i18next + react-i18next** — English and Amharic localization.
- **lucide-react** — the single icon library used across the app (consistent line icons, no emoji).
- **@fontsource (Inter, Noto Sans Ethiopic)** — self-hosted fonts so the PWA works offline.
- **vite-plugin-pwa** — web app manifest + Workbox service worker (installable PWA).

## Design system

Color and typography tokens are defined as CSS variables in `src/index.css` and mapped to Tailwind in `tailwind.config.ts`. Reusable, accessible components live in `src/design-system/` and are demonstrated on the Design System page (available from the in-app navigation).

- Buttons, Inputs, Selects, Dialogs, Navigation (top bar + bottom nav), Tables, Status indicators, Empty states, Loading states, and Notifications are all implemented as real, reusable components.

## Getting started

Requirements: Node 18+ and npm.

```sh
npm install
cp .env.example .env   # add your Supabase project URL and anon key
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server.
- `npm run build` — type-check (`tsc --noEmit`) and build for production.
- `npm run preview` — preview the production build.
- `npm run typecheck` — run `tsc --noEmit`.

## Environment variables

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |

See `.env.example`. Do not commit real secrets.

## Project structure

```
src/
  design-system/   reusable UI components (Button, Input, Select, Dialog, ...)
  layouts/         app shell (TopBar, BottomNav)
  pages/           welcome screen, design-system preview
  components/      app-level components (language switcher)
  locales/         i18next config + EN/AM translation files
  lib/             Supabase client, env, class-name helper
  modules/         placeholders for Phase 1 (auth, business modules)
```

## Status

Phase 0 — Foundation & Design System. Authentication and business modules (retail, food & beverage, bakery, service) are intentionally not implemented yet.
