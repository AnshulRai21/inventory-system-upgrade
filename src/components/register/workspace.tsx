import { useState, type ReactNode } from 'react'
import { FileSpreadsheet } from 'lucide-react'

import { currentMonth, exportRegisterCsv, monthLabel, registerRows, type Movement, type RegisterRow, type Snapshot } from '@/lib/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Panel } from './shell'
import { MonthlySummary, SummaryCards } from './summary'
import { HistoryTable, RegisterTable } from './tables'
import { ReportsPanel } from './reports-panel'

export type ExtraTab = { value: string; label: string; content: ReactNode }

/** Month-scoped register with summary cards, stock table, history, reports and monthly roll-up. */
export function RegisterWorkspace({
  snapshot,
  month: controlledMonth,
  onMonthChange,
  toolbar,
  registerActions,
  historyActions,
  leadingTabs = [],
  trailingTabs = [],
}: {
  snapshot: Snapshot
  month?: string
  onMonthChange?: (m: string) => void
  toolbar?: ReactNode
  registerActions?: (row: RegisterRow) => ReactNode
  historyActions?: (m: Movement) => ReactNode
  leadingTabs?: ExtraTab[]
  trailingTabs?: ExtraTab[]
}) {
  const [localMonth, setLocalMonth] = useState(currentMonth)
  const month = controlledMonth ?? localMonth
  const setMonth = onMonthChange ?? setLocalMonth
  const rows = registerRows(snapshot, month)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Inventory Register</p>
          <h2 className="text-2xl font-extrabold tracking-tight">{monthLabel(month)}</h2>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            Month
            <Input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="w-auto"
            />
          </label>
          <Button variant="outline" onClick={() => exportRegisterCsv(snapshot, month)}>
            <FileSpreadsheet /> Export CSV
          </Button>
          {toolbar}
        </div>
      </div>

      <SummaryCards rows={rows} />

      <Tabs defaultValue="register" className="gap-4">
        <TabsList className="no-print h-auto flex-wrap">
          {leadingTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="register">Stock register</TabsTrigger>
          <TabsTrigger value="history">Movement history</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="monthly">Monthly summary</TabsTrigger>
          {trailingTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {leadingTabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            {t.content}
          </TabsContent>
        ))}
        <TabsContent value="register">
          <Panel title="Stock Register" description={`Opening, received, consumed and closing stock for ${monthLabel(month)}.`}>
            <RegisterTable rows={rows} actions={registerActions} />
          </Panel>
        </TabsContent>
        <TabsContent value="history">
          <Panel title="Movement History" description={`Every receipt and issue recorded in ${monthLabel(month)}.`}>
            <HistoryTable snapshot={snapshot} month={month} actions={historyActions} />
          </Panel>
        </TabsContent>
        <TabsContent value="reports">
          <Panel title="Reports" description="Choose a report, dates and filters. Results update instantly and can be exported.">
            <ReportsPanel snapshot={snapshot} />
          </Panel>
        </TabsContent>
        <TabsContent value="monthly">
          <Panel title="Monthly Summary" description={`Stock values for the six months ending ${monthLabel(month)}.`}>
            <MonthlySummary snapshot={snapshot} month={month} />
          </Panel>
        </TabsContent>
        {trailingTabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
