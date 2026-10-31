import pg from 'pg'
const { Pool } = pg
const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required to initialise Railway PostgreSQL.')
const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 })
const seedItems = [
  ['Dental Kit','Nos',12.39],['Toothbrush pack - Paper Pouch Standard','Nos',16.76],['Shaving Kit','Nos',25],['Razor pack - paper pouch Standard','Nos',19.47],['Comb','Nos',4],['Comb pack - paper pouch standard','Nos',4.96],['Shower Cap','Nos',3],['Sanitary bag','Nos',2],['Plain Sewing kit','Nos',3],['Care Kit','Nos',4],['Business Kit','Nos',3],['Plain Loofah Pad','Nos',14],['Shoe Shiner With Sponge','Nos',9.44],['OT Slipper Jute','Nos',34.65],['Ignis bathing Bar 25g paper warp','Nos',11.8],['Ignis Shampoo Tube 22 ML','Nos',11.8],['Ignis Shower Gel Tube 22 ML','Nos',11.8],['Ignis Lotion Tube 22 ml','Nos',11.8],['Bio Morning Nectar Lotion (Orange Blossom) 35ml','BOT',15.93],['Bio Almond Oil Soap 30g','Nos',10.62],['Bio Shampoo (Orange Blossom) 35ml','BOT',16],['Bio Green Shampoo 25 ML','BOT',11.8],['Bio Apricot Gel (Orange Blossom) 35ml','BOT',16],['BIO Apricot Shower Gel 25 ML','Nos',11.8],
]
const client = await pool.connect()
try {
  await client.query('BEGIN')
  await client.query(`
    CREATE TABLE IF NOT EXISTS items (id serial PRIMARY KEY, name text NOT NULL, unit text NOT NULL DEFAULT 'Nos', rate double precision NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS opening_balances (id serial PRIMARY KEY, item_id integer NOT NULL REFERENCES items(id) ON DELETE CASCADE, month text NOT NULL, qty double precision NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS movements (id serial PRIMARY KEY, item_id integer REFERENCES items(id) ON DELETE SET NULL, item_name text NOT NULL DEFAULT '', type text NOT NULL, qty double precision NOT NULL, date date NOT NULL, rate double precision NOT NULL DEFAULT 0, location text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '', created_by text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS sync_state (id integer PRIMARY KEY, version integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE UNIQUE INDEX IF NOT EXISTS opening_item_month_idx ON opening_balances(item_id, month);
    CREATE INDEX IF NOT EXISTS movements_date_idx ON movements(date);
    CREATE INDEX IF NOT EXISTS movements_item_idx ON movements(item_id);
  `)
  const count = await client.query('SELECT COUNT(*)::int AS count FROM items')
  if (count.rows[0].count === 0) {
    for (const item of seedItems) await client.query('INSERT INTO items(name,unit,rate) VALUES($1,$2,$3)', item)
  }
  await client.query('INSERT INTO sync_state(id,version) VALUES(1,1) ON CONFLICT(id) DO NOTHING')
  await client.query('COMMIT')
  console.log('Railway inventory schema is ready.')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
