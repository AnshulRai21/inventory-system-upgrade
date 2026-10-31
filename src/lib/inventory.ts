// Pure inventory maths shared by the public register and the admin panel.
// Ported from the original single-file register: Closing = Opening + Received − Consumption.

export type MovementType = 'received' | 'consumed'

export type Item = {
  id: number
  name: string
  unit: string
  rate: number
  /** Explicit opening quantities keyed by month (YYYY-MM). */
  opening: Record<string, number>
}

export type Movement = {
  id: number
  itemId: number | null
  itemName: string
  type: MovementType
  qty: number
  date: string
  rate: number
  location: string
  note: string
}

export type Snapshot = {
  items: Item[]
  movements: Movement[]
  version: number
  updatedAt: string
}

export type ItemTotals = { opening: number; received: number; consumed: number; closing: number }

export const UNITS = ['Nos', 'BOT', 'Pack', 'Ltr', 'Kg', 'Other']

export const REPORT_TYPES = [
  { value: 'range', label: 'From Date – To Date Inventory Report' },
  { value: 'item', label: 'Item-wise Report' },
  { value: 'issues', label: 'Issues Report – Location / Date-wise' },
  { value: 'received', label: 'New Received Report – Date-wise' },
] as const
export type ReportType = (typeof REPORT_TYPES)[number]['value']

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
export const money = (n: number) => inr.format(n || 0)
export const qty = (n: number) => String(Math.round((n || 0) * 100) / 100)

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const currentMonth = () => todayISO().slice(0, 7)
export const firstOfMonth = () => currentMonth() + '-01'

export function prevMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

export function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

const sumType = (list: Movement[], type: MovementType) =>
  list.filter((m) => m.type === type).reduce((s, m) => s + m.qty, 0)

/** Computes month totals, carrying the previous month's closing forward when no opening was set. */
export function createCalculator(snapshot: Snapshot) {
  const byItem = new Map<number, Movement[]>()
  for (const m of snapshot.movements) {
    if (m.itemId == null) continue
    const list = byItem.get(m.itemId) ?? []
    list.push(m)
    byItem.set(m.itemId, list)
  }
  const cache = new Map<string, ItemTotals>()

  function earliestMonth(item: Item) {
    let min: string | null = null
    for (const k of Object.keys(item.opening)) if (!min || k < min) min = k
    for (const m of byItem.get(item.id) ?? []) {
      const k = m.date.slice(0, 7)
      if (!min || k < min) min = k
    }
    return min
  }

  function calc(item: Item, month: string): ItemTotals {
    const key = item.id + '|' + month
    const hit = cache.get(key)
    if (hit) return hit
    let open = item.opening[month]
    if (open === undefined) {
      const floor = earliestMonth(item)
      open = floor && month > floor ? calc(item, prevMonth(month)).closing : 0
    }
    const ms = (byItem.get(item.id) ?? []).filter((m) => m.date.startsWith(month))
    const received = sumType(ms, 'received')
    const consumed = sumType(ms, 'consumed')
    const result = { opening: open, received, consumed, closing: open + received - consumed }
    cache.set(key, result)
    return result
  }

  return calc
}

export type RegisterRow = { item: Item; totals: ItemTotals }

export function registerRows(snapshot: Snapshot, month: string): RegisterRow[] {
  const calc = createCalculator(snapshot)
  return snapshot.items.map((item) => ({ item, totals: calc(item, month) }))
}

export function registerTotals(rows: RegisterRow[]) {
  const v = (f: (t: ItemTotals) => number) => rows.reduce((s, r) => s + f(r.totals) * r.item.rate, 0)
  return {
    items: rows.length,
    opening: v((t) => t.opening),
    received: v((t) => t.received),
    consumed: v((t) => t.consumed),
    closing: v((t) => t.closing),
    lowStock: rows.filter((r) => r.totals.closing <= 0).length,
  }
}

export type ReportFilters = {
  type: ReportType
  from: string
  to: string
  itemId: string // 'all' or item id
  location: string
}

export type Report = {
  title: string
  headers: string[]
  rows: (string | number)[][]
  error?: string
}

export const isMoneyHeader = (h: string) => h.includes('(₹)') || h.includes('Value')

export function buildReport(snapshot: Snapshot, f: ReportFilters): Report {
  const from = f.from || '0001-01-01'
  const to = f.to || '9999-12-31'
  if (from > to) {
    return {
      title: 'Invalid date range',
      headers: [],
      rows: [],
      error: 'From date must be on or before To date.',
    }
  }
  const calc = createCalculator(snapshot)
  const loc = f.location.trim().toLowerCase()
  const itemFor = (id: number | null) => snapshot.items.find((i) => i.id === id)
  const nameOf = (m: Movement) => itemFor(m.itemId)?.name ?? (m.itemName ? `${m.itemName} (deleted)` : 'Deleted item')
  const rateOf = (m: Movement) => m.rate || itemFor(m.itemId)?.rate || 0
  const items = snapshot.items.filter((i) => f.itemId === 'all' || String(i.id) === f.itemId)
  const selected = snapshot.movements.filter(
    (m) =>
      m.date >= from &&
      m.date <= to &&
      (f.itemId === 'all' || String(m.itemId) === f.itemId) &&
      (!loc || m.location.toLowerCase().includes(loc)),
  )
  const range = `${f.from || 'start'} to ${f.to || 'today'}`

  if (f.type === 'range') {
    const rows = items.map((i) => {
      const month = from.slice(0, 7)
      const before = snapshot.movements.filter(
        (m) => m.itemId === i.id && m.date >= month + '-01' && m.date < from,
      )
      const opening = calc(i, month).opening + sumType(before, 'received') - sumType(before, 'consumed')
      const a = selected.filter((m) => m.itemId === i.id)
      const received = sumType(a, 'received')
      const consumed = sumType(a, 'consumed')
      const closing = opening + received - consumed
      return [i.name, opening, received, consumed, closing, closing * i.rate]
    })
    return {
      title: `Inventory Report: ${range}`,
      headers: ['Item', 'Opening Qty', 'Received Qty', 'Issued / Consumed Qty', 'Closing Qty', 'Closing Value (₹)'],
      rows,
    }
  }

  if (f.type === 'item') {
    const rows = items.map((i) => {
      const a = selected.filter((m) => m.itemId === i.id)
      const received = sumType(a, 'received')
      const consumed = sumType(a, 'consumed')
      const value = (t: MovementType) =>
        a.filter((m) => m.type === t).reduce((s, m) => s + m.qty * (m.rate || i.rate), 0)
      return [i.name, i.unit, received, consumed, received - consumed, a.length, value('received'), value('consumed')]
    })
    return {
      title: `Item-wise Report: ${range}`,
      headers: [
        'Item',
        'UOM',
        'Received Qty',
        'Issued / Consumed Qty',
        'Net Movement',
        'Transactions',
        'Received Value (₹)',
        'Issued Value (₹)',
      ],
      rows,
    }
  }

  if (f.type === 'issues') {
    const rows = selected
      .filter((m) => m.type === 'consumed')
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.location.localeCompare(b.location) || nameOf(a).localeCompare(nameOf(b)),
      )
      .map((m) => [m.date, m.location || 'Not specified', nameOf(m), m.qty, rateOf(m), m.qty * rateOf(m), m.note])
    return {
      title: `Issues Report — Location / Date-wise: ${range}`,
      headers: ['Date', 'Location / Department', 'Item', 'Issued Qty', 'Rate (₹)', 'Amount (₹)', 'Remarks'],
      rows,
    }
  }

  const rows = selected
    .filter((m) => m.type === 'received')
    .sort((a, b) => a.date.localeCompare(b.date) || nameOf(a).localeCompare(nameOf(b)))
    .map((m) => [m.date, nameOf(m), m.qty, rateOf(m), m.qty * rateOf(m), m.location || 'Not specified', m.note])
  return {
    title: `New Received Report — Date-wise: ${range}`,
    headers: ['Date', 'Item', 'Received Qty', 'Rate (₹)', 'Amount (₹)', 'Location / Department', 'Reference / Remarks'],
    rows,
  }
}

export function movementItemName(snapshot: Snapshot, m: Movement) {
  const item = snapshot.items.find((i) => i.id === m.itemId)
  return item?.name ?? (m.itemName ? `${m.itemName} (deleted)` : 'Deleted item')
}

// ---------- Export helpers (browser only) ----------

export function toCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n')
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function exportRegisterCsv(snapshot: Snapshot, month: string) {
  const rows: (string | number)[][] = [
    [
      'Item',
      'UOM',
      'Rate',
      'Opening Qty',
      'Opening Amount',
      'Received Qty',
      'Received Amount',
      'Consumption Qty',
      'Consumption Amount',
      'Closing Qty',
      'Closing Amount',
    ],
  ]
  for (const { item: i, totals: c } of registerRows(snapshot, month)) {
    rows.push([
      i.name,
      i.unit,
      i.rate,
      c.opening,
      c.opening * i.rate,
      c.received,
      c.received * i.rate,
      c.consumed,
      c.consumed * i.rate,
      c.closing,
      c.closing * i.rate,
    ])
  }
  download(`housekeeping-inventory-${month}.csv`, toCsv(rows), 'text/csv')
}

export function exportReportCsv(report: Report) {
  download('housekeeping-report.csv', toCsv([report.headers, ...report.rows]), 'text/csv')
}

/** Backup in the same shape as the original browser register, so old backups and new ones are interchangeable. */
export function backupJson(snapshot: Snapshot) {
  const data = {
    items: snapshot.items.map((i) => ({ id: String(i.id), name: i.name, unit: i.unit, rate: i.rate, opening: i.opening })),
    movements: snapshot.movements.map((m) => ({
      id: String(m.id),
      itemId: m.itemId == null ? null : String(m.itemId),
      itemName: m.itemName,
      type: m.type,
      qty: m.qty,
      date: m.date,
      rate: m.rate,
      location: m.location,
      note: m.note,
    })),
  }
  download(`housekeeping-inventory-backup-${todayISO()}.json`, JSON.stringify(data, null, 2), 'application/json')
}
