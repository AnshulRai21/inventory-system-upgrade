# Housekeeping Digital Inventory Register

A shared, cloud-backed inventory register for housekeeping supplies and consumables.

- Public view (/): read-only register with automatic refresh.
- Admin panel (/admin): shared username/password login for managing items, opening stock, receipts, consumption, reports and backups.
- All records live in PostgreSQL.

## Features

- Monthly stock register: opening, received, consumption and closing quantities and values
- 24 preloaded housekeeping items and rates
- Low-stock flags, search and filters
- Six-month summary and movement history
- Four reports with CSV export
- JSON backup and restore

## Deploy on Vercel

1. Create a new PostgreSQL database using a Vercel Marketplace provider (for example, Neon). Choose the provider's pooled connection string for application traffic.
2. Import this GitHub repository into Vercel and select the `vercel-migration` branch as the Production Branch for the initial rollout. Keep the existing Netlify deployment separate.
3. In Vercel Project Settings → Environment Variables, add the following for Production:
   - `DATABASE_URL`: the pooled PostgreSQL connection string supplied by your database provider.
   - `ADMIN_USERNAME`: `admin` or your chosen shared username.
   - `ADMIN_PASSWORD`: a long, unique secret.
4. Keep the Framework Preset as **TanStack Start**. The repository's `vercel.json` explicitly sets the TanStack Start framework preset. Vercel detects the build and output settings through Nitro; leave the Build Command and Output Directory at their detected defaults.
5. Before deploying, initialise the new database once by running `npm run db:migrate` from the project root with `DATABASE_URL` set to the new database connection string. Do not add the migration command to Vercel's build command: Preview builds should not mutate the production database. Then deploy the Production Branch using Vercel's detected build settings.
6. Open the deployed URL and verify the public register, administrator login, item editing, stock movements, reports and backup/restore.

For Preview deployments, either disable them during the initial rollout or configure a separate preview PostgreSQL database and its own `DATABASE_URL`. Do not point an untrusted Preview deployment at the production inventory database.

The database setup creates the four inventory tables and indexes, adds the standard 24-item catalogue only when the items table is empty, and initialises the sync version row. It does not read, connect to, or alter the old Netlify database. The migration script is safe to run again on the same database.

## Local development

Use Node.js 22.22+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env
# Set DATABASE_URL, ADMIN_USERNAME and ADMIN_PASSWORD
npm run db:migrate
npm run dev
```

## Administrator access

Vercel uses one shared administrator username/password. Store both as Vercel environment variables; never commit credentials. Admin sessions use a signed HTTP-only, SameSite=Lax cookie and expire after 12 hours. Changing the password invalidates existing sessions.

## Fresh database behaviour

The new database starts with the standard 24 catalogue items and no historical stock movements or opening balances. Use the admin panel's JSON backup/restore only if you later decide to import historical data.
