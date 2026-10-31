import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.js'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required.')

// Keep the per-instance pool small: Vercel can run many function instances concurrently.
// Use the provider's pooled PostgreSQL connection string for serverless deployments.
const pool = new Pool({
  connectionString,
  max: 2,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 10_000,
})

export const db = drizzle(pool, { schema })
