# AGENTS.md

## Project overview

Housekeeping Digital Inventory Register: a TanStack Start app on Netlify that replaces an earlier single-file, `localStorage` register with a shared database. There are two interfaces over the same data:

- `/`: public, read-only register. It needs no login.
- `/admin`: the admin panel, gated by Netlify Identity. Users need the `admin` role.

## Architecture

| Concern | Where |
| --- | --- |
| DB schema (Drizzle) | `db/schema.ts`. Tables: `items`, `opening_balances` (per item per `YYYY-MM`), `movements`, `sync_state` (a single row whose version counter is bumped on every write) |
| DB client | `db/index.ts` (`drizzle-orm/netlify-db`) |
| Migrations | `netlify/database/migrations/`. The second migration is a hand-written custom migration that seeds the 24 register items and the `sync_state` row |
| Server functions | `src/lib/inventory.functions.ts`. Public reads are `getSnapshot`, `getVersion` and `getSession`. Every write uses the `requireAdmin` middleware |
| Server-only DB helpers | `src/lib/inventory.server.ts` |
| Pure calculations, reports, CSV/JSON export | `src/lib/inventory.ts`. Shared by both views and ported from the original HTML |
| Live sync | `src/lib/use-live-snapshot.ts`. Polls `getVersion` every 8 seconds and on focus, and reloads the full snapshot only when the version changes |
| Shared register UI | `src/components/register/` (header, summary cards, register and history tables, reports, and `RegisterWorkspace`, which composes them) |
| Admin UI | `src/components/admin/` (`AdminGate` handles login, invite, recovery and the role check; `admin-forms` holds the dialogs and movement form) |
| Routes | `src/routes/index.tsx` (public), `src/routes/admin.tsx` (admin) |

## Key decisions

- **Security lives on the server.** Hiding buttons is only for the UI. Every mutating server function calls `getUser()` and checks `roles` includes `admin`. Roles live in Identity `app_metadata` and only the dashboard or admin API can set them.
- **The whole snapshot goes to the client.** The data set is small (dozens of items, thousands of movements), so balances and reports are computed in the browser with the same logic as the original register. If data grows a lot, move the report aggregation into SQL.
- **Opening carry-forward.** If a month has no explicit opening, it uses the previous month's closing, back to the item's earliest month with data. This removes the infinite recursion in the original.
- **Deleting an item** keeps its movements: `item_id` is set to null and `item_name` is kept, so reports show "(deleted)".
- **Backup format** matches the original `localStorage` JSON (`{items:[{id,name,unit,rate,opening}], movements:[...]}`), so old browser backups can be restored. Restore replaces all data inside one transaction.
- Invite and recovery emails land on `/`. The public page forwards the token hash to `/admin`.

## Conventions

- Validate all server function input with zod through `.validator(...)`.
- Schema changes must go through `db/schema.ts` plus `npx drizzle-kit generate --name <snake_case>`. Never edit applied migrations.
- Keep calculation logic in `src/lib/inventory.ts` and keep it pure.
- Use Tailwind with theme variables from `src/styles.css`. Use the `.num` class for right-aligned tabular numbers and `.no-print` for elements hidden when printing.
