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

## Deploy on Railway

1. Create a Railway project and add a PostgreSQL service.
2. Deploy this repository as a Node service from GitHub.
3. Add these variables to the app service:
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}` (replace Postgres with the exact name of your database service if different)
   - `ADMIN_USERNAME=admin` (or your chosen shared username)
   - `ADMIN_PASSWORD=<long unique secret>`
4. Set the app service Pre-deploy Command to `npm run db:migrate`.
5. Set Build Command to `npm run build` and Start Command to `npm start`.
6. Generate a public domain in the service Networking settings.

The database setup creates the four inventory tables and indexes, adds the standard 24-item catalogue only when the items table is empty, and initialises the sync version row. It does not read, connect to, or alter the old Netlify database.

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

Railway uses one shared administrator username/password. Store both as Railway service variables; never commit credentials. Admin sessions use a signed HTTP-only, SameSite=Lax cookie and expire after 12 hours. Changing the password invalidates existing sessions.

## Fresh database behaviour

The new database starts with the standard 24 catalogue items and no historical stock movements or opening balances. Use the admin panel's JSON backup/restore only if you later decide to import historical data.
