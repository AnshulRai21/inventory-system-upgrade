import { useMemo, useState } from 'react'
import { FileDown, Printer } from 'lucide-react'

import {
  REPORT_TYPES,
  buildReport,
  exportReportCsv,
  firstOfMonth,
  isMoneyHeader,
  money,
  todayISO,
  type ReportFilters,
  type ReportType,
  type Snapshot,
} from '@/lib/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Field, NativeSelect } from './shell'

export function ReportsPanel({ snapshot }: { snapshot: Snapshot }) {
  const [filters, setFilters] = useState<ReportFilters>(() => ({
    type: 'range',
    from: firstOfMonth(),
    to: todayISO(),
    itemId: 'all',
    location: '',
  }))
  const set = <K extends keyof ReportFilters>(k: K, v: ReportFilters[K]) => setFilters((f) => ({ ...f, [k]: v }))
  // Reports regenerate automatically whenever the filters or the live data change.
  const report = useMemo(() => buildReport(snapshot, filters), [snapshot, filters])

  function print() {
    document.body.classList.add('printing-report')
    const done = () => {
      document.body.classList.remove('printing-report')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }

  const fmt = (v: string | number, j: number) =>
    typeof v === 'number' ? (isMoneyHeader(report.headers[j]) ? money(v) : String(Math.round(v * 100) / 100)) : v

  return (
    <div className="space-y-5">
      <div className="no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Report type" htmlFor="report-type">
          <NativeSelect id="report-type" value={filters.type} onChange={(e) => set('type', e.target.value as ReportType)}>
            {REPORT_TYPES.map((r, i) => (
              <option key={r.value} value={r.value}>
                {i + 1}. {r.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="From date" htmlFor="report-from">
          <Input id="report-from" type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />
        </Field>
        <Field label="To date" htmlFor="report-to">
          <Input id="report-to" type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} />
        </Field>
        <Field label="Item filter" htmlFor="report-item">
          <NativeSelect id="report-item" value={filters.itemId} onChange={(e) => set('itemId', e.target.value)}>
            <option value="all">All items</option>
            {snapshot.items.map((i) => (
              <option key={i.id} value={String(i.id)}>
                {i.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Location filter" htmlFor="report-location">
          <Input
            id="report-location"
            placeholder="All locations"
            value={filters.location}
            onChange={(e) => set('location', e.target.value)}
          />
        </Field>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => exportReportCsv(report)} disabled={!!report.error}>
          <FileDown /> Export report CSV
        </Button>
        <Button variant="outline" size="sm" onClick={print} disabled={!!report.error}>
          <Printer /> Print / Save PDF
        </Button>
      </div>

      <div id="report-print" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-bold">{report.title}</h3>
          {!report.error && <span className="text-xs text-muted-foreground">{report.rows.length} row(s)</span>}
        </div>
        {report.error ? (
          <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {report.error}
          </p>
        ) : (
          <div className="rounded-xl border">
            <Table className="min-w-[760px] text-[13px]">
              <TableHeader className="bg-muted/60">
                <TableRow>
                  {report.headers.map((h, j) => (
                    <TableHead key={h} className={j > 0 && typeof report.rows[0]?.[j] === 'number' ? 'text-right' : ''}>
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.map((r, idx) => (
                  <TableRow key={idx}>
                    {r.map((v, j) => (
                      <TableCell
                        key={j}
                        className={typeof v === 'number' ? 'num' : 'max-w-72 whitespace-normal'}
                      >
                        {fmt(v, j)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {report.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={report.headers.length} className="py-10 text-center text-muted-foreground">
                      No records found for these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
