# MELA â€” Project Context (Handoff Document)

> **Current as of Phase 12** â€” Phase 12 (Staff & Permissions) complete, committed on branch `phase-1-onboarding`.
> This document supersedes all previous versions. Treat it as the single source of truth.

---

## 1. Project Overview

- **Name:** MELA (`mela`, version `0.1.0`)
- **Purpose:** Ethiopian-first small business management SaaS â€” a mobile-first, installable PWA.
- **Target users:** Ethiopian small-business owners across Retail, Food & Beverage, Bakery & Production, and Services.
- **Production domain:** https://solution.pro.et
- **Current stage:** Phases 0â€“6.4 implemented. Phases 0â€“4.2 are committed. Phases 5+, 6.1â€“6.4 are uncommitted working-tree changes.

---

## 2. Technology Stack

- **React 19.3.1** Â· **Vite 8.3.6** Â· **TypeScript 7.0.2** (strict)
- **Tailwind CSS 3.4.19** (token-driven, CSS variables)
- **react-router-dom 7.18.5** (declarative `<BrowserRouter>`)
- **i18next 26.7.2** + **react-i18next 17.1.3** â€” English + Amharic (439 keys each, exact parity)
- **Supabase** (`@supabase/supabase-js 2.119.0`) + PostgreSQL â€” anon key only, never service-role key
- **lucide-react 1.69.0** â€” single icon library
- **Outfit** (400/500/600/700 TTF, self-hosted in `public/fonts/Outfit/`) â€” brand font for Latin/EN
- **@fontsource/noto-sans-ethiopic** 5.3.0 â€” Amharic glyphs, self-hosted via npm
- **vite-plugin-pwa 2.0.0** â€” manifest + Workbox SW, installable PWA
- **clsx 2.1.1** + **tailwind-merge 3.7.0** â€” `cn()` helper
- **No test runner**

**Hosting:** Vercel (configured via `vercel.json`, see Â§9).

### devDependencies (testing)

- **vitest@2.1.9** â€” test runner (Vite-native)
- **@vitest/coverage-v8@2.1.9** â€” V8 coverage provider
- **fake-indexeddb@6.0.0** â€” in-memory IndexedDB for tests

---

## 3. Architecture

SPA React app + Supabase backend (Auth + Postgres). Client-side routing, anon-key-only data access, RLS enforces per-owner isolation on every table. No server application code.

### Key directories

```
src/
  components/       LanguageSwitcher, ProfileMenu (avatar + dropdown)
  design-system/    Button, Input, Select, Dialog, Table, StatusBadge,
                    EmptyState, LoadingState, Notification, TopBar, BottomNav, cn
  layouts/          AppShell (TopBar + optional BottomNav + fullWidth prop)
  lib/              supabase.ts (null when unconfigured), env.ts
  locales/          i18n.ts, en/translation.json, am/translation.json (439 keys each)
  modules/
    auth/           api.ts, AuthContext.tsx, BusinessForm.tsx, GoogleIcon.tsx,
                    RouteGuards.tsx, types.ts
    customers/      api.ts, CustomerForm.tsx, types.ts, useCustomers.ts
    expenses/       api.ts, ExpenseForm.tsx, types.ts, useExpenses.ts
    overview/       dateRange.ts (shared timezone helpers), financials.ts
    purchases/      api.ts, types.ts, usePurchases.ts
    reports/        reportData.ts
    retail/         api.ts, inventoryApi.ts, inventoryTypes.ts, ProductForm.tsx,
                    salesApi.ts, types.ts, useMovements.ts, useProducts.ts, useSales.ts
    suppliers/      api.ts, SupplierForm.tsx, types.ts, useSuppliers.ts
    bakery/ fnb/ service/   empty placeholder dirs
  pages/            (20 pages â€” see Â§3 routes)
supabase/
  migrations/       0001â€“0010 (see Â§3 schema)
public/
  favicon/          PWA icons (192, 512, maskable, ICO, SVG)
  fonts/Outfit/     Outfit-Regular/Medium/SemiBold/Bold.ttf
  Logo.svg          Brand mark
vercel.json         SPA rewrite rule
```

### Routes

```
/                   WelcomePage            (public, fullWidth shell)
/auth/callback      AuthCallbackPage       (Google OAuth PKCE)
/login              PublicOnly > LoginPage
/register           PublicOnly > RegisterPage
/onboarding         RequireProfile > OnboardingPage
/privacy            PrivacyPage            (public)
/terms              TermsPage              (public)
/contact            ContactPage            (public)
/app                RequireBusiness > OverviewPage        (analytics dashboard)
/app/pos            RequireBusiness > PosPage
/app/sales          RequireBusiness > SalesPage
/app/purchases      RequireBusiness > PurchasesPage
/app/customers      RequireBusiness > CustomersPage
/app/suppliers      RequireBusiness > SuppliersPage
/app/expenses       RequireBusiness > ExpensesPage
/app/inventory      RequireBusiness > InventoryPage       (history + low-stock alerts)
/app/reports        RequireBusiness > ReportsPage
/app/products       RequireBusiness > ProductsPage
/app/profile        RequireBusiness > EditBusinessProfilePage
*                   Navigate to /
```

**Nav items (authenticated shell):** Home Â· POS Â· Sales Â· Purchases Â· Customers Â· Suppliers Â· Expenses Â· Inventory History Â· Reports Â· Products

### Database schema (all tables owner-scoped RLS)

| Migration | Table(s) | Key points |
|---|---|---|
| 0001 | `businesses` | One per owner (unique index on `owner_id`); `set_updated_at()` trigger |
| 0002 | `products` | `selling_price`, `cost_price?`, `stock_quantityâ‰¥0`, `sku` unique per owner, `low_stock_threshold?` (added 0010) |
| 0003 | `sales`, `sale_items` | `sales` has `idempotency_key` (0004); `sale_items` has `unit_cost` snapshot (0006) |
| 0004 | â€” | Replaces `complete_sale()`: idempotency + cash=paid/others=pending |
| 0005 | `expenses` | `amount>0`, category enum, `expense_date` |
| 0006 | â€” | Adds `unit_cost` to `sale_items`; replaces `complete_sale()` to snapshot cost |
| 0007 | `customers`, `suppliers` | Both: name/phone/email/address/notes; owner-scoped |
| 0008 | `inventory_movements` | `movement_type` enum, `quantity_changeâ‰ 0`, `stock_before/afterâ‰¥0`, `reference_id`; replaces `complete_sale()` to also record sale movements |
| 0009 | `purchases`, `purchase_items` | `receive_purchase()` RPC: atomic stock increase + cost snapshot + movement recording + idempotency |
| 0010 | â€” | Adds `low_stock_threshold?` column to `products` |

### RPC functions (all `SECURITY DEFINER`, `set search_path = public`, enforce `auth.uid() = p_owner_id`)

| RPC | Defined in | Purpose |
|---|---|---|
| `complete_sale()` | 0008 (latest) | POS checkout: stock deduct + sale movements; idempotent |
| `adjust_stock()` | 0008 | Manual stock adjustment; records movement |
| `receive_purchase()` | 0009 | Purchase receipt: stock increase + movement + cost update; idempotent |

---

## 4. Implementation Status

| Feature | Status |
|---|---|
| Design system (10 component categories) | âœ… Complete |
| PWA (manifest, SW, Outfit fonts cached) | âœ… Complete |
| EN/AM localization (439 keys, exact parity) | âœ… Complete |
| Outfit brand font (self-hosted TTF, preloaded) | âœ… Complete |
| Email/password auth | âœ… Complete, live-verified |
| Google OAuth (PKCE, `/auth/callback`) | âœ… Code complete; requires Supabase dashboard config |
| Business onboarding + profile edit | âœ… Complete, live-verified |
| Protected routes + session persistence | âœ… Complete |
| Language preference persistence | âœ… Complete (localStorage + businesses.language) |
| Products CRUD + low-stock threshold | âœ… Complete |
| POS checkout (atomic, idempotent, ETB) | âœ… Complete |
| Cash=paid / Telebirr+bank=pending | âœ… Complete |
| Sales history + detail view | âœ… Complete |
| Expenses CRUD + search/filter | âœ… Complete |
| Business overview dashboard (6 metrics, charts) | âœ… Complete |
| COGS / gross / net profit (partial-data flagging) | âœ… Complete |
| Financial reports (8 sections, custom date range) | âœ… Complete |
| Customers CRUD + search | âœ… Complete (Phase 6.1) |
| Suppliers CRUD + search | âœ… Complete (Phase 6.1) |
| Inventory movement history | âœ… Complete (Phase 6.2) |
| Stock adjustments (RPC) | âœ… Complete (Phase 6.2) |
| Sale movements auto-recorded | âœ… Complete (Phase 6.2) |
| Purchase receiving (atomic RPC) | âœ… Complete (Phase 6.3) |
| Purchase history + detail view | âœ… Complete (Phase 6.3) |
| Low-stock threshold per product | âœ… Complete (Phase 6.4) |
| Low-stock alerts on inventory page | âœ… Complete (Phase 6.4) |
| Quick restock from inventory page | âœ… Complete (Phase 6.4, reuses `receive_purchase`) |
| Profile dropdown (settings, sign-out) | âœ… Complete |
| Welcome page (editorial hero, Outfit font) | âœ… Complete |
| Footer (responsive: desktop 4-col, mobile links) | âœ… Complete |
| Legal pages (Privacy, Terms, Contact) | âœ… Complete |
| Vercel deployment config (`vercel.json`) | âœ… Complete |
| Migrations 0001â€“0006 applied to production | âš ï¸ Status unknown â€” user was applying manually |
| Migrations 0007â€“0010 applied to production | âŒ Not applied (authored only) |
| Google OAuth dashboard config | âš ï¸ Code complete; dashboard config status unknown |
| Deployment to solution.pro.et | âŒ Not deployed |
| Automated tests | âŒ No test runner |
| Security hardening (Phase 13) | âœ… Complete â€” RLS audit, anon-key-only, sync owner_id comments |
| Test runner (Phase 13) | âœ… Complete â€” vitest@2.1.9 installed, vitest.config.ts created |
| Production config (Phase 13) | âœ… Complete â€” sourcemap: false, VITE_APP_URL warning, env.appUrl |
| Subscriptions (Phase 11) | âœ… Complete â€” Free/Premium plans, entitlement gates, payment flow, migration 0013 |
| Staff & Permissions (Phase 12) | âœ… Complete â€” PIN-based staff switcher, role presets, per-permission toggles, activity log, migration 0014, Edge Function |
| Staff/user management | âœ… Complete (Phase 12) |
| F&B, Bakery, Service modules | âŒ Placeholder dirs only |

---

## 5. Commit History (most recent â†’ oldest)

All Phase 6.x work is **uncommitted** (working tree). The last commit is `0a422d5`.

| Commit | Description |
|---|---|
| `0a422d5` | **HEAD** â€” fix: correct Amharic translations, responsive footer, Telegram support link |
| `6f0348c` | fix: repair AM JSON corruption, restore 307-key parity |
| `ecb9f45` | fix: hero text visibility, logo in mockup, rounded CTAs, full EN/AM parity |
| `b0f5f1b` | fix: hero spacing/contrast, footer, legal pages, remove unused fonts |
| `19f0807` | feat: redesign welcome page with editorial hero and Outfit brand font |
| `b082e36` | fix: reports page layout |
| `92dec44` | refactor: profile menu â€” single settings item |
| `3eb8dac` | feat: profile dropdown menu in top bar |
| `575a64f` | feat: redesign overview as analytics dashboard |
| `9db161e` | feat: persistent sign-out in top bar |
| `b62fad9` | fix: Phase 4.2 â€” row-limit guards + COGS normalisation |
| `469a3fa` | feat: Phase 4.1 â€” business reports |
| `3e5950e` | feat: Phase 3.3 â€” complete business overview |
| `3791a03` | feat: Phase 3.2 â€” cost snapshots + financial calculations |
| `05304b4` | feat: Phase 3.1 â€” expense management |
| `0320a01` | fix: Phase 2.3 â€” idempotency key + payment status |
| `73addbd` | feat: Phase 2.3 â€” POS + sales management |
| `6bdaeb8` | feat: Phase 2.2 â€” product CRUD UI |
| `c9e8a24` | feat: Phase 2.1 â€” retail products foundation |
| `63e939c` | feat: Google OAuth sign-in |
| `6095b09` | feat: Phase 1 â€” auth + business onboarding |
| `9e626e9` | `phase-0-foundation` â€” Phase 0 design system + PWA |
| `7560da7` | Initial commit (`origin/main`) |

---

## 6. Current State

- **Working tree:** Phase 6.4 changes are uncommitted (see `git status` above â€” ~15 modified/untracked files)
- **Last committed:** `0a422d5` (Amharic translation fixes, responsive footer)
- **Build status:** âœ… `npm run build` passes (tsc clean, 2199 modules, PWA generated, exit 0)
- **Translation parity:** âœ… 439 keys EN = 439 AM, zero divergence
- **Deployment:** Not deployed. `origin/main` is still the initial commit. No branch has been pushed.

---

## 7. Known Issues / Blockers

1. **Migrations 0007â€“0010 not applied** â€” authored in `supabase/migrations/` but not run against the Supabase project. Apply in order in the Supabase SQL Editor. Migration 0010 depends on 0009; 0009 depends on 0007 and 0008; 0008 depends on 0001.

2. **Nothing committed since `0a422d5`** â€” Phases 6.1â€“6.4, deployment config (`vercel.json`, updated `vite.config.ts`, `README.md`, `.env.example`) are all uncommitted working-tree changes. Should be committed before deployment.

3. **Google OAuth dashboard config** â€” code is complete; Supabase Google provider config status is unknown. Required for Google sign-in to work.

4. **Email confirmation** â€” should be OFF in Supabase Auth â†’ Providers â†’ Email for the <5-min onboarding target.

5. **`README.md` stale** â€” updated in working tree (not committed); describes current architecture accurately.

6. **`AppPlaceholder.tsx`** â€” orphaned (replaced by OverviewPage, not routed), can be deleted.

7. **Bundle size** â€” JS â‰ˆ 758 kB gzip: 210 kB; Vite warns >500 kB. No code-splitting. Not a blocker.

8. **Migration 0013 (subscriptions) needs to be applied after migration 0012.** Migration 0013 introduces the subscriptions schema, plan limits, and enforcement functions. It depends on all prior migrations being in place.

9. **Subscription limits are enforced at DB level via PostgreSQL functions in migration 0013.** Count-based limits (products, customers, suppliers, monthly sales, monthly purchases) use atomic DB functions and RLS policies â€” not UI-only checks.

10. **/app/subscription page added; payment verification is a manual admin flow.** Users submit Telebirr/CBE/bank transaction references; an authorized admin verifies and activates the subscription in the `subscription_payments` table.

---

## 8. Important Decisions and Constraints

**Technology (fixed â€” do not change):** React 19 + Vite 8 + TypeScript strict + Tailwind v3 + Supabase + i18next + lucide-react + vite-plugin-pwa.

**Design tokens (fixed):**
- Primary `#123D35` Â· Interactive `#1C6B53` Â· Mint `#D9F0E4` Â· Background `#F7F7F2` Â· Text `#252A27` Â· Text-secondary `#58685F` (WCAG AA) Â· Muted `#87968D` (non-text only)
- Fonts: Outfit (Latin/EN, self-hosted TTF) Â· Noto Sans Ethiopic (Amharic, @fontsource)

**Security rules (never relax):**
- Anon key only in frontend; no service-role key anywhere in source
- All tables have RLS enabled with `owner_id = auth.uid()` policies
- All RPCs are `SECURITY DEFINER` + `set search_path = public` + `auth.uid() = p_owner_id` enforcement

**Data integrity rules (never relax):**
- Only PAID sales count as revenue
- PENDING sales separate, never added to revenue
- CANCELLED sales excluded from all calculations
- `unit_cost = NULL` on sale_items = unknown cost, never treated as zero
- Stock is updated only through RPCs (`complete_sale`, `adjust_stock`, `receive_purchase`)
- `.limit(10000)` on every list query

**Bilingual:** 439 keys EN = 439 AM. Add keys to both files (via Node script in the project root pattern â€” not PowerShell inline â€” to avoid encoding corruption).

**Encoding warning:** Direct PowerShell `Set-Content` or `Out-File` corrupts Amharic UTF-8. Always use Node.js `fs.writeFileSync` for locale file writes.

---

## 9. Environment and Configuration

**Required env vars (`VITE_` prefix exposes to browser):**
- `VITE_SUPABASE_URL` â€” `https://yszcsnhsdytsvetssefa.supabase.co`
- `VITE_SUPABASE_ANON_KEY` â€” Supabase anon/public key (safe to expose)
- `VITE_APP_URL` â€” `https://solution.pro.et` (production) / `http://localhost:5173` (dev)

**Scripts:**
```
npm install
npm run dev          # localhost:5173
npm run build        # tsc --noEmit && vite build  â† the gate
npm run preview
npm run typecheck    # tsc --noEmit only
npm test             # vitest run
npm run test:coverage  # vitest run --coverage
```

**Vercel deployment:**
1. Connect repo â†’ Framework: Vite â†’ Build: `npm run build` â†’ Output: `dist`
2. Add 3 env vars in Project Settings
3. Custom domain: `solution.pro.et`
4. Supabase â†’ Auth â†’ URL Config â†’ Redirect URLs: add `https://solution.pro.et/auth/callback`

`vercel.json` is present â€” handles SPA routing (all non-asset paths â†’ `/index.html`).

---

## 10. Pending Tasks (priority order)

1. **Commit all Phase 6.1â€“6.4 work** (plus vercel.json, README, vite.config, .env.example) with a meaningful commit message
2. **Apply migrations 0007â€“0010** in Supabase SQL Editor (in order)
3. **Apply migration 0013 (subscriptions schema)** in Supabase SQL Editor â€” must run after migrations 0001â€“0012 are applied
4. **Configure Google OAuth** (Google Cloud Console + Supabase provider + redirect URLs)
5. **Disable email confirmation** (Supabase Auth â†’ Providers â†’ Email)
6. **Live-test Phase 6.1â€“6.4 flows** â€” customers, suppliers, inventory, purchases, low-stock alerts
7. **Deploy to Vercel** once migrations are applied and tested
8. **(Optional)** Code-split with `React.lazy`/`Suspense` to reduce bundle
9. **(Optional)** Update/expand F&B, Bakery, or Services modules
10. **(Optional)** Delete orphaned `AppPlaceholder.tsx`

---

## 11. Exact Continuation Point

- **Last commit:** `0a422d5` on `phase-1-onboarding`
- **Uncommitted work:** Phases 6.1â€“6.4 (customers, suppliers, inventory movements, stock adjustments, purchases, low-stock alerts + quick restock) plus deployment config, plus Phase 13 security hardening and test infrastructure
- **Immediate next action:** Phase 13 FEAT-001 complete. Next: FEAT-002 â€” write test suites for critical business workflows

---

## 12. Instructions for the Next AI Assistant

- This document is the **primary handoff**. It is accurate as of Phase 6.4.
- **Phases 6.1â€“6.4 are implemented but uncommitted.** Do not re-implement them. Commit and apply migrations instead.
- Do not use PowerShell to write Amharic locale files â€” use a Node.js `.mjs` script with `fs.writeFileSync` to avoid UTF-8 corruption.
- Always run the parity check after touching translations: `node -e "..."` (see previous session pattern).
- Mirror the `owner_id = auth.uid()` RLS pattern for any new tables. New RPCs must use `SECURITY DEFINER` + `set search_path = public`.
- Keep `.limit(10000)` on all list queries.
- Financial honesty rules: only PAID sales = revenue; PENDING separate; CANCELLED excluded; NULL cost â‰  zero.
- The Supabase project URL is `https://yszcsnhsdytsvetssefa.supabase.co`. Do not echo the anon key.
- After major milestones, update this `PROJECT_CONTEXT.md`.

