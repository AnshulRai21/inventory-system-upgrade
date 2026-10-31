import { useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'

import { money, movementItemName, qty, type Movement, type RegisterRow, type Snapshot } from '@/lib/inventory'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { NativeSelect } from './shell'

export function RegisterTable({
  rows,
  actions,
}: {
  rows: RegisterRow[]
  actions?: (row: RegisterRow) => ReactNode
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'in'>('all')
  const q = search.trim().toLowerCase()
  const visible = rows.filter(
    (r) =>
      r.item.name.toLowerCase().includes(q) &&
      (filter === 'all' || (filter === 'low' ? r.totals.closing <= 0 : r.totals.closing > 0)),
  )
  const cols = actions ? 12 : 11

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search items"
            placeholder="Search item…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <NativeSelect
          aria-label="Stock filter"
          className="w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">All items</option>
          <option value="in">In stock</option>
          <option value="low">Low / zero stock</option>
        </NativeSelect>
        <span className="text-xs text-muted-foreground">Closing = Opening + Received − Consumption</span>
      </div>
      <div className="rounded-xl border">
        <Table className="min-w-[1050px] text-[13px]">
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead className="text-right">Rate (₹)</TableHead>
              <TableHead className="text-right">Opening Qty</TableHead>
              <TableHead className="text-right">Opening Value</TableHead>
              <TableHead className="text-right">Received Qty</TableHead>
              <TableHead className="text-right">Received Value</TableHead>
              <TableHead className="text-right">Consumption Qty</TableHead>
              <TableHead className="text-right">Consumption Value</TableHead>
              <TableHead className="text-right">Closing Qty</TableHead>
              <TableHead className="text-right">Closing Value</TableHead>
              {actions && <TableHead className="no-print text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => {
              const { item: i, totals: c } = r
              return (
                <TableRow key={i.id}>
                  <TableCell className="max-w-80 whitespace-normal">
                    <span className="font-semibold">{i.name}</span>{' '}
                    {c.closing <= 0 && (
                      <Badge className="ml-1 border-amber-200 bg-amber-50 text-amber-800" variant="outline">
                        Low stock
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{i.unit}</TableCell>
                  <TableCell className="num">{i.rate.toFixed(2)}</TableCell>
                  <TableCell className="num">{qty(c.opening)}</TableCell>
                  <TableCell className="num text-muted-foreground">{money(c.opening * i.rate)}</TableCell>
                  <TableCell className="num text-emerald-700">{qty(c.received)}</TableCell>
                  <TableCell className="num text-muted-foreground">{money(c.received * i.rate)}</TableCell>
                  <TableCell className="num text-rose-700">{qty(c.consumed)}</TableCell>
                  <TableCell className="num text-muted-foreground">{money(c.consumed * i.rate)}</TableCell>
                  <TableCell className="num font-bold">{qty(c.closing)}</TableCell>
                  <TableCell className="num font-semibold">{money(c.closing * i.rate)}</TableCell>
                  {actions && <TableCell className="no-print text-right">{actions(r)}</TableCell>}
                </TableRow>
              )
            })}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={cols} className="py-10 text-center text-muted-foreground">
                  No items match this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {visible.length} of {rows.length} items.
      </p>
    </div>
  )
}

export function HistoryTable({
  snapshot,
  month,
  actions,
}: {
  snapshot: Snapshot
  month: string
  actions?: (m: Movement) => ReactNode
}) {
  const [type, setType] = useState<'all' | 'received' | 'consumed'>('all')
  const list = snapshot.movements
    .filter((m) => m.date.startsWith(month) && (type === 'all' || m.type === type))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  const cols = actions ? 8 : 7

  return (
    <div className="space-y-3">
      <div className="no-print flex items-center gap-2">
        <NativeSelect
          aria-label="Movement type"
          className="w-auto"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="all">All movements</option>
          <option value="received">Received only</option>
          <option value="consumed">Consumed only</option>
        </NativeSelect>
        <span className="text-xs text-muted-foreground">{list.length} movement(s) this month</span>
      </div>
      <div className="rounded-xl border">
        <Table className="min-w-[760px] text-[13px]">
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Rate (₹)</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead>Location / Reference / Remarks</TableHead>
              {actions && <TableHead className="no-print" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((m) => {
              const rate = m.rate || snapshot.items.find((i) => i.id === m.itemId)?.rate || 0
              return (
                <TableRow key={m.id}>
                  <TableCell className="tabular-nums">{m.date}</TableCell>
                  <TableCell className="max-w-72 whitespace-normal font-medium">{movementItemName(snapshot, m)}</TableCell>
                  <TableCell>
                    {m.type === 'received' ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                        Received
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-800">
                        Consumed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="num">{qty(m.qty)}</TableCell>
                  <TableCell className="num">{rate.toFixed(2)}</TableCell>
                  <TableCell className="num font-semibold">{money(m.qty * rate)}</TableCell>
                  <TableCell className="max-w-80 whitespace-normal text-muted-foreground">
                    {[m.location, m.note].filter(Boolean).join(' — ') || '—'}
                  </TableCell>
                  {actions && <TableCell className="no-print text-right">{actions(m)}</TableCell>}
                </TableRow>
              )
            })}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={cols} className="py-10 text-center text-muted-foreground">
                  No movements for this month.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
