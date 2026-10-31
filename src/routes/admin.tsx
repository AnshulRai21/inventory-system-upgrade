import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { DatabaseBackup, LogOut, Pencil, PackagePlus, PlusCircle, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import {
  backupJson,
  createCalculator,
  currentMonth,
  type Item,
  type Movement,
  type Snapshot,
} from '@/lib/inventory'
import {
  deleteItem,
  deleteMovement,
  getSnapshot,
  restoreBackup,
  saveItem,
  saveMovement,
  setOpening,
} from '@/lib/inventory.functions'
import { useLiveSnapshot } from '@/lib/use-live-snapshot'
import { AppHeader, Panel } from '@/components/register/shell'
import { RegisterWorkspace } from '@/components/register/workspace'
import { AdminGate, type AdminSession } from '@/components/admin/admin-gate'
import {
  ConfirmDialog,
  ItemDialog,
  MovementForm,
  OpeningDialog,
  useAction,
  type ItemDraft,
  type MovementDraft,
} from '@/components/admin/admin-forms'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [{ title: 'Admin · Housekeeping Digital Inventory Register' }, { name: 'robots', content: 'noindex' }] }),
  loader: () => getSnapshot(),
  component: AdminPage,
})

function AdminPage() {
  const initial = Route.useLoaderData()
  const live = useLiveSnapshot(initial)

  return (
    <div className="min-h-screen">
      <AdminGate>
        {(session, signOut) => <AdminPanel live={live} session={session} signOut={signOut} />}
      </AdminGate>
    </div>
  )
}

const emptyItem: ItemDraft = { name: '', unit: 'Nos', rate: 0, opening: 0 }

function AdminPanel({
  live,
  session,
  signOut,
}: {
  live: ReturnType<typeof useLiveSnapshot>
  session: AdminSession
  signOut: () => void
}) {
  const { snapshot, status, lastChecked, reload } = live
  const [month, setMonth] = useState(currentMonth)
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null)
  const [openingFor, setOpeningFor] = useState<Item | null>(null)
  const [deletingItem, setDeletingItem] = useState<Item | null>(null)
  const [editingMove, setEditingMove] = useState<Movement | null>(null)
  const [deletingMove, setDeletingMove] = useState<Movement | null>(null)
  const [pendingRestore, setPendingRestore] = useState<{ name: string; data: unknown; items: number; movements: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { run } = useAction()
  const calc = createCalculator(snapshot)

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    const ok = await run(fn, msg)
    if (ok) await reload()
    return ok
  }

  const saveMove = (d: MovementDraft) =>
    act(() => saveMovement({ data: d }), d.id ? 'Movement corrected' : 'Movement saved').then((ok) => {
      if (ok && !d.id) setMonth(d.date.slice(0, 7))
      return ok
    })

  async function pickBackup(file: File | undefined) {
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as { items?: unknown; movements?: unknown }
      if (!Array.isArray(data.items) || !Array.isArray(data.movements)) throw new Error()
      setPendingRestore({ name: file.name, data, items: data.items.length, movements: data.movements.length })
    } catch {
      toast.error('This file is not a valid inventory backup.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <AppHeader mode="admin" status={status} lastChecked={lastChecked}>
        <span className="hidden text-xs text-white/70 lg:inline">{session.email}</span>
        <Button size="sm" variant="secondary" onClick={signOut}>
          <LogOut /> Sign out
        </Button>
      </AppHeader>

      <main className="mx-auto max-w-(--content-width) px-4 py-6 sm:px-6">
        <RegisterWorkspace
          snapshot={snapshot}
          month={month}
          onMonthChange={setMonth}
          toolbar={
            <Button onClick={() => setItemDraft(emptyItem)}>
              <PackagePlus /> Add item
            </Button>
          }
          registerActions={({ item, totals }) => (
            <div className="flex justify-end gap-1">
              <Button
                size="xs"
                variant="outline"
                onClick={() =>
                  setItemDraft({ id: item.id, name: item.name, unit: item.unit, rate: item.rate, opening: totals.opening })
                }
              >
                <Pencil /> Edit
              </Button>
              <Button size="xs" variant="outline" onClick={() => setOpeningFor(item)}>
                Set opening
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                aria-label={`Delete ${item.name}`}
                onClick={() => setDeletingItem(item)}
              >
                <Trash2 />
              </Button>
            </div>
          )}
          historyActions={(m) => (
            <div className="flex justify-end gap-1">
              <Button size="xs" variant="outline" onClick={() => setEditingMove(m)}>
                <Pencil /> Correct
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                aria-label="Delete movement"
                onClick={() => setDeletingMove(m)}
              >
                <Trash2 />
              </Button>
            </div>
          )}
          leadingTabs={[
            {
              value: 'movement',
              label: 'Record movement',
              content: (
                <Panel
                  title="Record Stock Movement"
                  description="Record stock received (stock in) or consumed / issued (stock out). The public view updates within seconds."
                >
                  {snapshot.items.length ? (
                    <MovementForm snapshot={snapshot} onSave={saveMove} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Add an item first.</p>
                  )}
                </Panel>
              ),
            },
          ]}
          trailingTabs={[
            {
              value: 'data',
              label: 'Backup & restore',
              content: (
                <BackupPanel
                  snapshot={snapshot}
                  onBackup={() => backupJson(snapshot)}
                  onRestoreClick={() => fileRef.current?.click()}
                />
              ),
            },
          ]}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => void pickBackup(e.target.files?.[0])}
        />
      </main>

      {itemDraft && (
        <ItemDialog
          open
          onOpenChange={(o) => !o && setItemDraft(null)}
          initial={itemDraft}
          month={month}
          onSave={(d) =>
            act(
              () => saveItem({ data: { id: d.id, name: d.name, unit: d.unit, rate: d.rate, opening: d.opening, month } }),
              d.id ? 'Item updated' : 'Item added',
            )
          }
        />
      )}

      <OpeningDialog
        item={openingFor}
        month={month}
        current={openingFor ? calc(openingFor, month).opening : 0}
        onOpenChange={(o) => !o && setOpeningFor(null)}
        onSave={(qty) =>
          act(() => setOpening({ data: { itemId: openingFor!.id, month, qty } }), 'Opening stock updated')
        }
      />

      <ConfirmDialog
        open={!!deletingItem}
        title="Delete item?"
        description={
          <>
            <strong>{deletingItem?.name}</strong> will be removed from the register. Its past movements stay in the history
            and reports, marked as a deleted item.
          </>
        }
        confirmLabel="Delete item"
        onOpenChange={(o) => !o && setDeletingItem(null)}
        onConfirm={() => act(() => deleteItem({ data: { id: deletingItem!.id } }), 'Item deleted')}
      />

      <ConfirmDialog
        open={!!deletingMove}
        title="Delete this stock movement?"
        description={
          deletingMove && (
            <>
              {deletingMove.type === 'received' ? 'Receipt' : 'Issue'} of <strong>{deletingMove.qty}</strong> on{' '}
              {deletingMove.date}. Stock balances will be recalculated.
            </>
          )
        }
        confirmLabel="Delete movement"
        onOpenChange={(o) => !o && setDeletingMove(null)}
        onConfirm={() => act(() => deleteMovement({ data: { id: deletingMove!.id } }), 'Movement deleted')}
      />

      <Dialog open={!!editingMove} onOpenChange={(o) => !o && setEditingMove(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Correct stock movement</DialogTitle>
            <DialogDescription>Changes are applied to all balances and reports immediately.</DialogDescription>
          </DialogHeader>
          {editingMove && (
            <MovementForm
              key={editingMove.id}
              snapshot={snapshot}
              initial={editingMove}
              onCancel={() => setEditingMove(null)}
              onSave={async (d) => {
                const ok = await saveMove(d)
                if (ok) setEditingMove(null)
                return ok
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingRestore}
        title="Replace the shared register?"
        description={
          pendingRestore && (
            <>
              Restoring <strong>{pendingRestore.name}</strong> ({pendingRestore.items} items, {pendingRestore.movements}{' '}
              movements) replaces <strong>all</strong> current items, opening balances and movements for everyone. Download
              a backup first if you may need the current data.
            </>
          )
        }
        confirmLabel="Restore backup"
        onOpenChange={(o) => !o && setPendingRestore(null)}
        onConfirm={() =>
          act(
            () => restoreBackup({ data: pendingRestore!.data as never }),
            'Backup restored',
          )
        }
      />
    </>
  )
}

function BackupPanel({
  snapshot,
  onBackup,
  onRestoreClick,
}: {
  snapshot: Snapshot
  onBackup: () => void
  onRestoreClick: () => void
}) {
  return (
    <Panel title="Backup & Restore" description="Download a full copy of the register or restore one into the shared database.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-5">
          <DatabaseBackup className="mb-3 size-6 text-primary" />
          <h3 className="font-semibold">Download backup (JSON)</h3>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            {snapshot.items.length} items and {snapshot.movements.length} movements, including all monthly opening balances.
          </p>
          <Button onClick={onBackup}>Backup JSON</Button>
        </div>
        <div className="rounded-xl border p-5">
          <Upload className="mb-3 size-6 text-primary" />
          <h3 className="font-semibold">Restore from backup</h3>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Accepts backups from this system and from the original browser-based register, so existing data can be moved
            across.
          </p>
          <Button variant="outline" onClick={onRestoreClick}>
            <PlusCircle /> Restore JSON
          </Button>
        </div>
      </div>
    </Panel>
  )
}
