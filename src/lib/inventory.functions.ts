import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/index.js'
import { items, movements, openingBalances } from '../../db/schema.js'
import { bump, readSnapshot, readVersion, upsertOpening } from './inventory.server'
import { checkSharedLogin, endSharedSession, readSharedSession, sharedLoginEnabled, startSharedSession } from './shared-admin.server'

export const ADMIN_ROLE = 'admin'

export const getSnapshot = createServerFn({ method: 'GET' }).handler(() => readSnapshot())
export const getVersion = createServerFn({ method: 'GET' }).handler(() => readVersion())
export const getSession = createServerFn({ method: 'GET' }).handler(() => {
  const username = readSharedSession()
  return username ? { email: username, name: 'Administrator', isAdmin: true, shared: true } : null
})
export const getLoginOptions = createServerFn({ method: 'GET' }).handler(() => ({ shared: sharedLoginEnabled() }))

export const sharedLogin = createServerFn({ method: 'POST' })
  .validator(z.object({ username: z.string().trim().min(1).max(200), password: z.string().min(1).max(500) }))
  .handler(({ data }) => {
    if (!checkSharedLogin(data.username, data.password)) return { ok: false }
    startSharedSession()
    return { ok: true }
  })

export const sharedLogout = createServerFn({ method: 'POST' }).handler(() => {
  endSharedSession()
  return { ok: true }
})

const requireAdmin = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const username = readSharedSession()
  if (!username) throw new Error('Please sign in as an administrator.')
  return next({ context: { user: { email: username } } })
  const shared = readSharedSession()
  if (!shared) throw new Error('Please sign in as an administrator.')
  return next({ context: { user: { email: shared } } })
})

const month = z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM')
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
const nonNeg = z.number().finite().min(0)

export const saveItem = createServerFn({ method: 'POST' }).middleware([requireAdmin])
  .validator(z.object({ id: z.number().int().optional(), name: z.string().trim().min(1).max(200), unit: z.string().trim().min(1).max(30), rate: nonNeg, month, opening: nonNeg }))
  .handler(async ({ data }) => {
    let id = data.id
    if (id) {
      const updated = await db.update(items).set({ name: data.name, unit: data.unit, rate: data.rate, updatedAt: new Date() }).where(eq(items.id, id)).returning({ id: items.id })
      if (!updated.length) throw new Error('Item not found.')
    } else {
      const [row] = await db.insert(items).values({ name: data.name, unit: data.unit, rate: data.rate }).returning({ id: items.id })
      id = row.id
    }
    await upsertOpening(id, data.month, data.opening)
    await bump()
    return { id }
  })

export const deleteItem = createServerFn({ method: 'POST' }).middleware([requireAdmin])
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    await db.transaction(async (tx) => {
      const [item] = await tx.select().from(items).where(eq(items.id, data.id))
      if (!item) throw new Error('Item not found.')
      await tx.update(movements).set({ itemName: item.name }).where(eq(movements.itemId, data.id))
      await tx.delete(items).where(eq(items.id, data.id))
    })
    await bump()
    return { ok: true }
  })

export const setOpening = createServerFn({ method: 'POST' }).middleware([requireAdmin])
  .validator(z.object({ itemId: z.number().int(), month, qty: nonNeg }))
  .handler(async ({ data }) => { await upsertOpening(data.itemId, data.month, data.qty); await bump(); return { ok: true } })

const movementInput = z.object({
  itemId: z.number().int(), type: z.enum(['received', 'consumed']), qty: z.number().finite().positive(),
  date: isoDate, rate: nonNeg.optional(), location: z.string().trim().max(200).default(''), note: z.string().trim().max(500).default(''),
})

export const saveMovement = createServerFn({ method: 'POST' }).middleware([requireAdmin])
  .validator(movementInput.extend({ id: z.number().int().optional() }))
  .handler(async ({ data, context }) => {
    const [item] = await db.select().from(items).where(eq(items.id, data.itemId))
    if (!item) throw new Error('Item not found.')
    const values = { itemId: item.id, itemName: item.name, type: data.type, qty: data.qty, date: data.date, rate: data.rate ?? item.rate, location: data.location, note: data.note }
    if (data.id) {
      const updated = await db.update(movements).set(values).where(eq(movements.id, data.id)).returning({ id: movements.id })
      if (!updated.length) throw new Error('Movement not found.')
    } else await db.insert(movements).values({ ...values, createdBy: context.user.email ?? '' })
    await bump()
    return { ok: true }
  })

export const deleteMovement = createServerFn({ method: 'POST' }).middleware([requireAdmin])
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => { await db.delete(movements).where(eq(movements.id, data.id)); await bump(); return { ok: true } })

const idLike = z.union([z.string(), z.number()]).transform(String)
const backupSchema = z.object({
  items: z.array(z.object({ id: idLike, name: z.string().trim().min(1).max(200), unit: z.string().trim().max(30).default('Nos'), rate: z.coerce.number().finite().min(0).default(0), opening: z.record(z.string(), z.coerce.number().finite()).default({}) })),
  movements: z.array(z.object({ itemId: idLike.nullable().optional(), itemName: z.string().optional(), type: z.enum(['received', 'consumed']), qty: z.coerce.number().finite(), date: isoDate, rate: z.coerce.number().finite().min(0).optional(), location: z.string().max(200).optional(), note: z.string().max(500).optional() })),
})

export const restoreBackup = createServerFn({ method: 'POST' }).middleware([requireAdmin])
  .validator(backupSchema)
  .handler(async ({ data, context }) => {
    await db.transaction(async (tx) => {
      await tx.delete(movements); await tx.delete(openingBalances); await tx.delete(items)
      const idMap = new Map<string, { id: number; name: string; rate: number }>()
      for (const i of data.items) {
        const [row] = await tx.insert(items).values({ name: i.name, unit: i.unit || 'Nos', rate: i.rate }).returning({ id: items.id })
        idMap.set(i.id, { id: row.id, name: i.name, rate: i.rate })
        const openings = Object.entries(i.opening).filter(([m]) => /^\d{4}-\d{2}$/.test(m))
        if (openings.length) await tx.insert(openingBalances).values(openings.map(([m, q]) => ({ itemId: row.id, month: m, qty: q })))
      }
      const rows = data.movements.map((m) => {
        const item = m.itemId != null ? idMap.get(m.itemId) : undefined
        return { itemId: item?.id ?? null, itemName: item?.name ?? m.itemName ?? '', type: m.type, qty: m.qty, date: m.date, rate: m.rate || item?.rate || 0, location: m.location ?? '', note: m.note ?? '', createdBy: context.user.email ?? '' }
      })
      for (let i = 0; i < rows.length; i += 500) await tx.insert(movements).values(rows.slice(i, i + 500))
    })
    await bump()
    return { items: data.items.length, movements: data.movements.length }
  })
