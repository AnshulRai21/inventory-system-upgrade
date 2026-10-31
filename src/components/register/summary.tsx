import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, PackageCheck, Wallet } from 'lucide-react'

import {
  monthLabel,
  money,
  prevMonth,
  registerRows,
  registerTotals,
  type RegisterRow,
  type Snapshot,
} from '@/lib/inventory'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export function SummaryCards({ rows }: { rows: RegisterRow[] }) {
  const t = registerTotals(rows)
  const cards = [
    { label: 'Items in register', value: String(t.items), icon: Boxes, tone: 'text-sky-700 bg-sky-50' },
    { label: 'Opening stock value', value: money(t.opening), icon: Wallet, tone: 'text-indigo-700 bg-indigo-50' },
    { label: 'Received value', value: money(t.received), icon: ArrowDownToLine, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Consumption value', value: money(t.consumed), icon: ArrowUpFromLine, tone: 'text-rose-700 bg-rose-50' },
    { label: 'Closing stock value', value: money(t.closing), icon: PackageCheck, tone: 'text-[oklch(0.33_0.08_252)] bg-[oklch(0.94_0.03_252)]' },
    {
      label: 'Low / zero stock',
      value: String(t.lowStock),
      icon: AlertTriangle,
      tone: t.lowStock ? 'text-amber-700 bg-amber-50' : 'text-muted-foreground bg-muted',
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
            <span className={cn('grid size-7 place-items-center rounded-lg', c.tone)}>
              <c.icon className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl">{c.value}</div>
        </div>
      ))}
    </div>
  )
}

/** Six-month roll-up of stock values ending at the selected month. */
export function MonthlySummary({ snapshot, month }: { snapshot: Snapshot; month: string }) {
  const months: string[] = []
  let m = month
  for (let i = 0; i < 6; i++) {
    months.unshift(m)
    m = prevMonth(m)
  }
  const data = months.map((mm) => ({ month: mm, ...registerTotals(registerRows(snapshot, mm)) }))
  const max = Math.max(1, ...data.map((d) => Math.max(d.received, d.consumed)))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-6 items-end gap-3" role="img" aria-label="Received and consumed value by month">
        {data.map((d) => (
          <div key={d.month} className="flex flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end justify-center gap-1">
              <div
                className="w-1/3 max-w-6 rounded-t-md bg-emerald-500/80"
                style={{ height: `${(d.received / max) * 100}%` }}
                title={`Received ${money(d.received)}`}
              />
              <div
                className="w-1/3 max-w-6 rounded-t-md bg-rose-500/75"
                style={{ height: `${(d.consumed / max) * 100}%` }}
                title={`Consumed ${money(d.consumed)}`}
              />
            </div>
            <span className={cn('text-xs', d.month === month ? 'font-bold' : 'text-muted-foreground')}>
              {monthLabel(d.month).replace(/ \d{4}$/, '')}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500/80" /> Received value
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-rose-500/75" /> Consumption value
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead className="text-right">Opening value</TableHead>
            <TableHead className="text-right">Received value</TableHead>
            <TableHead className="text-right">Consumption value</TableHead>
            <TableHead className="text-right">Closing value</TableHead>
            <TableHead className="text-right">Low / zero stock items</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...data].reverse().map((d) => (
            <TableRow key={d.month} className={d.month === month ? 'bg-muted/60 font-semibold' : undefined}>
              <TableCell>{monthLabel(d.month)}</TableCell>
              <TableCell className="num">{money(d.opening)}</TableCell>
              <TableCell className="num">{money(d.received)}</TableCell>
              <TableCell className="num">{money(d.consumed)}</TableCell>
              <TableCell className="num">{money(d.closing)}</TableCell>
              <TableCell className="num">{d.lowStock}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
