# Modules

This directory holds feature modules introduced in later phases. Phase 0 only
prepares the structure — there is no feature code here yet.

## Planned structure

- `auth/` — sign in / sign up, session handling, tenant onboarding (Phase 1).
- `retail/` — retail sales, point of sale, inventory.
- `fnb/` — food & beverage: menus, tables, orders.
- `bakery/` — bakery production, recipes, daily batches.
- `service/` — service businesses: appointments, billing.

## Conventions

Each module should expose its own routes, components, and locale namespaces,
and consume the shared design system in `src/design-system/`. Multi-tenant
wiring will be added once authentication lands.
