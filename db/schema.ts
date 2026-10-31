import {
  doublePrecision,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const items = pgTable('items', {
  id: serial().primaryKey(),
  name: text().notNull(),
  unit: text().notNull().default('Nos'),
  rate: doublePrecision().notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/** Opening quantity explicitly set for an item in a given month (YYYY-MM). */
export const openingBalances = pgTable(
  'opening_balances',
  {
    id: serial().primaryKey(),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    month: text().notNull(),
    qty: doublePrecision().notNull().default(0),
  },
  (t) => [uniqueIndex('opening_item_month_idx').on(t.itemId, t.month)],
)

export const movements = pgTable(
  'movements',
  {
    id: serial().primaryKey(),
    // Kept when an item is deleted so history still reads "Deleted item".
    itemId: integer('item_id').references(() => items.id, { onDelete: 'set null' }),
    itemName: text('item_name').notNull().default(''),
    type: text().notNull(), // 'received' | 'consumed'
    qty: doublePrecision().notNull(),
    date: date({ mode: 'string' }).notNull(),
    rate: doublePrecision().notNull().default(0),
    location: text().notNull().default(''),
    note: text().notNull().default(''),
    createdBy: text('created_by').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('movements_date_idx').on(t.date), index('movements_item_idx').on(t.itemId)],
)

/** Single-row table bumped on every write so public viewers can detect changes cheaply. */
export const syncState = pgTable('sync_state', {
  id: integer().primaryKey(),
  version: integer().notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
