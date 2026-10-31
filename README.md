# Housekeeping Digital Inventory Register

A shared, cloud-backed inventory register for housekeeping guest supplies and consumables. It has two access points:

- **Public view (`/`)**: anyone with the link can see the register without signing in. It's read-only and updates on its own when stock changes.
- **Admin panel (`/admin`)**: only signed-in administrators can add or edit items, set opening stock, record receipts and consumption, correct or delete movements, and back up or restore the data.

All data lives in one shared Postgres database, so a change made by an admin on one device shows up for every viewer within a few seconds.

## Features

- Stock register for each month: opening, received, consumption and closing quantities and values (Closing = Opening + Received − Consumption)
- 24 preloaded items with rates from the September 2026 register
- Low or zero stock flags, search and filters
- Summary cards and a six-month summary
- Movement history for each month
- Four reports: date range inventory, item-wise, issues by location and date, and new receipts by date. Each can be exported to CSV or printed or saved as PDF
- CSV export of the register
- JSON backup and restore. Backups from the original browser-only register are accepted too

## Tech stack

- TanStack Start (React 19, TanStack Router) with Vite, deployed on Netlify
- Netlify Database (managed Postgres) with Drizzle ORM
- Netlify Identity for administrator login and roles
- Tailwind CSS 4 and shadcn/ui components

## Setting up administrators

1. Deploy the site, then open **Identity** in the Netlify dashboard and click **Invite users**.
2. The invited person accepts the email invite and sets a password on the site.
3. In the Identity user list, open that user and add the role `admin`.
4. Recommended: under **Project configuration › Identity**, set Registration to **Invite only**.

Accounts without the `admin` role can sign in but can't change anything.

## Running locally

```bash
pnpm install
netlify dev
```

`netlify dev` provides the local database and Identity emulation. Database migrations live in `netlify/database/migrations/` and are applied automatically on deploy. After changing `db/schema.ts`, run `npx drizzle-kit generate --name <change>`.
