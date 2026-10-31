# Housekeeping Digital Inventory Register

A shared, cloud-backed inventory register for housekeeping guest supplies and consumables.

- **Public view (/):** anyone with the link can view the register without signing in. It is read-only and refreshes automatically when stock changes.
- **Admin panel (/admin):** one shared administrator username and password can add or edit items, set opening stock, record receipts and consumption, correct or delete movements, and back up or restore data.
- **Database:** PostgreSQL on Railway, accessed through Drizzle ORM.

## Features

- Monthly opening, received, consumption and closing quantities and values (Closing = Opening + Received - Consumption)
- 24 preloaded housekeeping items and rates from the September 2026 register
- Low/zero-stock flags, search and filters
- Six-month summary and movement history
- Date-range, item-wise, issue-location and receipt reports
- CSV exports, print/PDF and JSON backup/restore
- Public view automatically detects changes made by administrators

## Railway deployment

1. Create a Railway project and add a PostgreSQL service.
2. Deploy this GitHub repository as a Node service.
3. In the app service, set these variables:
   - `DATABASE_URL`: reference the PostgreSQL service's `DATABASE_URL` variable.
   - `ADMIN_USERNAME`: the shared admin username (for example, `admin`).
   - `ADMIN_PASSWORD`: a long, unique password. Keep it secret; never commit it to Git.
4. Use Node.js 22.13 or newer. The build command is `npm run build`; the start command is `npm start`.
5. Generate a public domain in the app service's Settings → Networking.

The start command runs the idempotent fresh-database schema/seed migration before starting the TanStack Start Nitro server. The migration creates the four inventory tables and seeds the 24 standard items only once. It does not import data from the former Netlify database.

## Fresh database behaviour

A new Railway PostgreSQL database starts with the 24 standard item definitions and their default rates. It starts with no opening-balance history and no stock movements. Admins should enter the correct opening balances for the first month before recording stock movements.

## Local development

```bash
npm install
npm run dev
```

Set `DATABASE_URL`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` in your local environment before using database-backed routes.
