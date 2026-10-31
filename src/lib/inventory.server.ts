// Server-only database helpers used by the server functions in inventory.functions.ts.
import { asc, eq, sql } from 'drizzle-orm'

import { db } from '../../db/index.js'
import { items, movements, openingBalances, syncState } from '../../db/schema.js'
import type { Movement, MovementType, Snapshot } from './inventory'

export async function readVersion() {
  const [row] = await db.select().from(syncState).where(eq(syncState.id, 1))
  return { version: row?.version ?? 0, updatedAt: (row?.updatedAt ?? new Date(0)).toISOString() }
}

export async function readSnapshot(): Promise<Snapshot> {
  const [itemRows, openingRows, movementRows, v] = await Promise.all([
    db.select().from(items).orderBy(asc(items.id)),
    db.select().from(openingBalances),
    db.select().from(movements).orderBy(asc(movements.date), asc(movements.id)),
    readVersion(),
  ])
  const openingByItem = new Map<number, Record<string, number>>()
  for (const o of openingRows) {
    const rec = openingByItem.get(o.itemId) ?? {}
    rec[o.month] = o.qty
    openingByItem.set(o.itemId, rec)
  }
  return {
    items: itemRows.map((i) => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      rate: i.rate,
      opening: openingByItem.get(i.id) ?? {},
    })),
    movements: movementRows.map(
      (m): Movement => ({
        id: m.id,
        itemId: m.itemId,
        itemName: m.itemName,
        type: m.type as MovementType,
        qty: m.qty,
        date: m.date,
        rate: m.rate,
        location: m.location,
        note: m.note,
      }),
    ),
    ...v,
  }
}

export async function bump() {
  await db
    .update(syncState)
    .set({ version: sql`${syncState.version} + 1`, updatedAt: new Date() })
    .where(eq(syncState.id, 1))
}

export async function upsertOpening(itemId: number, m: string, qty: number) {
  await db
    .insert(openingBalances)
    .values({ itemId, month: m, qty })
    .onConflictDoUpdate({ target: [openingBalances.itemId, openingBalances.month], set: { qty } })
}
