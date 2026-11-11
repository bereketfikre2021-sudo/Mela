# MELA

Ethiopian-first small business management PWA â€” sales, inventory, expenses and insights for retail, food & beverage, bakery and service businesses.

**Production:** https://solution.pro.et  
**Stack:** React 19 Â· Vite 8 Â· TypeScript (strict) Â· Tailwind CSS v3 Â· Supabase Â· i18next Â· vite-plugin-pwa  
**Languages:** English + Amharic (áŠ áˆ›áˆ­áŠ›)

---

## Requirements

- Node 18+
- npm

---

## Local development

```sh
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build â†’ `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run `tsc --noEmit` only |

---

## Environment variables

Create `.env` from `.env.example`. Never commit `.env`.

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (safe to expose) |
| `VITE_APP_URL` | Production URL (`https://solution.pro.et`) |

---

## Deployment â€” Vercel

1. Connect the repository in the [Vercel dashboard](https://vercel.com).
2. Framework preset: **Vite**.
3. Build command: `npm run build`  
   Output directory: `dist`
4. Add the three environment variables above in **Project â†’ Settings â†’ Environment Variables**.
5. Set the **Production Domain** to `solution.pro.et` under **Project â†’ Settings â†’ Domains**.

SPA routing on direct page refresh is handled by `vercel.json` (already in the repo).

### Google OAuth redirect URLs to allow-list in Supabase

Go to **Supabase â†’ Authentication â†’ URL Configuration â†’ Redirect URLs** and add:

```
http://localhost:5173/auth/callback
https://solution.pro.et/auth/callback
```

---

## Database migrations

SQL files live in `supabase/migrations/`. Apply them in order in the **Supabase SQL Editor**:

| File | Description |
|---|---|
| `0001_businesses_and_rls.sql` | Business profiles + RLS |
| `0002_products.sql` | Products + RLS |
| `0003_sales.sql` | Sales + sale items (original) |
| `0004_sales_fixes.sql` | Idempotency key + payment-status fix |
| `0005_expenses.sql` | Expenses + RLS |
| `0006_sale_items_unit_cost.sql` | Unit-cost snapshot for COGS |

**Run 0001 first** â€” later migrations depend on the `set_updated_at()` function it creates.

---

## Project structure

```
src/
  components/      LanguageSwitcher, ProfileMenu
  design-system/   Button, Input, Select, Dialog, Table, StatusBadge,
                   EmptyState, LoadingState, Notification, TopBar, BottomNav
  layouts/         AppShell
  lib/             Supabase client, env reader
  locales/         i18next config + EN/AM translation files (307 keys each)
  modules/
    auth/          Auth context, route guards, business form, Google OAuth
    expenses/      Expense CRUD API, hook, form
    overview/      Financial calculations, date-range helpers
    reports/       Report aggregation service
    retail/        Product + sales CRUD API, hooks
  pages/           All route components
supabase/
  migrations/      SQL migration files (apply manually)
public/
  favicon/         PWA icons (192px, 512px, maskable, ICO, SVG)
  fonts/Outfit/    Outfit 400/500/600/700 TTF (brand font)
  Logo.svg         MELA brand mark
vercel.json        SPA routing fallback for Vercel
```

---

## Design tokens

Defined as CSS variables in `src/index.css`, mapped to Tailwind in `tailwind.config.ts`.

| Token | Value | Use |
|---|---|---|
| Primary | `#123D35` | Brand, buttons, icons |
| Primary interactive | `#1C6B53` | Hover states |
| Mint / soft | `#D9F0E4` | Backgrounds, badges |
| Background | `#F7F7F2` | Page background |
| Text | `#252A27` | Body text |
| Text secondary | `#58685F` | Secondary copy (WCAG AA) |

Fonts: **Outfit** (Latin/EN, self-hosted TTF) Â· **Noto Sans Ethiopic** (Amharic, via @fontsource)

