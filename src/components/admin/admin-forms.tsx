import { useState, type FormEvent, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { UNITS, createCalculator, monthLabel, qty, todayISO, type Item, type Movement, type Snapshot } from '@/lib/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, NativeSelect } from '@/components/register/shell'

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Could not save. Please try again.')

/** Runs an admin mutation with pending state and toasts. */
export function useAction() {
  const [pending, setPending] = useState(false)
  async function run(fn: () => Promise<unknown>, success: string) {
    setPending(true)
    try {
      await fn()
      toast.success(success)
      return true
    } catch (e) {
      toast.error(errorText(e))
      return false
    } finally {
      setPending(false)
    }
  }
  return { pending, run }
}

export type ItemDraft = { id?: number; name: string; unit: string; rate: number; opening: number }

export function ItemDialog({
  open,
  onOpenChange,
  initial,
  month,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: ItemDraft
  month: string
  onSave: (d: ItemDraft) => Promise<boolean>
}) {
  const [pending, setPending] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setPending(true)
    const ok = await onSave({
      id: initial.id,
      name: String(f.get('name')).trim(),
      unit: String(f.get('unit')),
      rate: Number(f.get('rate')),
      opening: Number(f.get('opening')),
    })
    setPending(false)
    if (ok) onOpenChange(false)
  }
  const units = UNITS.includes(initial.unit) ? UNITS : [initial.unit, ...UNITS]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial.id ? 'Edit item' : 'Add new item'}</DialogTitle>
          <DialogDescription>Opening quantity applies to {monthLabel(month)}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} key={initial.id ?? 'new'}>
          <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Item name *" htmlFor="item-name">
                <Input id="item-name" name="name" required defaultValue={initial.name} placeholder="e.g. Dental Kit" />
              </Field>
            </div>
            <Field label="Unit of measure" htmlFor="item-unit">
              <NativeSelect id="item-unit" name="unit" defaultValue={initial.unit}>
                {units.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Rate (₹ per unit)" htmlFor="item-rate">
              <Input id="item-rate" name="rate" type="number" min="0" step="0.01" required defaultValue={initial.rate} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={`Opening quantity — ${monthLabel(month)}`} htmlFor="item-opening">
                <Input
                  id="item-opening"
                  name="opening"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={initial.opening}
                />
              </Field>
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {pending && <Loader2 className="animate-spin" />}
                Save item
              </Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function OpeningDialog({
  item,
  month,
  current,
  onOpenChange,
  onSave,
}: {
  item: Item | null
  month: string
  current: number
  onOpenChange: (o: boolean) => void
  onSave: (value: number) => Promise<boolean>
}) {
  const [pending, setPending] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const ok = await onSave(Number(new FormData(e.currentTarget).get('qty')))
    setPending(false)
    if (ok) onOpenChange(false)
  }
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set opening stock</DialogTitle>
          <DialogDescription>
            {item?.name} · {monthLabel(month)}. Leave months without an opening to carry forward the previous closing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} key={`${item?.id}-${month}`}>
          <fieldset disabled={pending} className="space-y-4">
            <Field label="Opening quantity" htmlFor="opening-qty">
              <Input id="opening-qty" name="qty" type="number" min="0" step="0.01" required defaultValue={current} autoFocus />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {pending && <Loader2 className="animate-spin" />}
                Save opening
              </Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  onOpenChange: (o: boolean) => void
  onConfirm: () => Promise<boolean>
}) {
  const [pending, setPending] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div>{description}</div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true)
              const ok = await onConfirm()
              setPending(false)
              if (ok) onOpenChange(false)
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type MovementDraft = {
  id?: number
  itemId: number
  type: 'received' | 'consumed'
  qty: number
  date: string
  rate?: number
  location: string
  note: string
}

/** Record a new receipt/issue, or correct an existing movement when `initial.id` is set. */
export function MovementForm({
  snapshot,
  initial,
  onSave,
  onCancel,
}: {
  snapshot: Snapshot
  initial?: Movement
  onSave: (d: MovementDraft) => Promise<boolean>
  onCancel?: () => void
}) {
  const [pending, setPending] = useState(false)
  const [itemId, setItemId] = useState(String(initial?.itemId ?? snapshot.items[0]?.id ?? ''))
  const [type, setType] = useState<'received' | 'consumed'>(initial?.type ?? 'received')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [overdraw, setOverdraw] = useState(false)

  const item = snapshot.items.find((i) => String(i.id) === itemId)
  const available = item ? createCalculator(snapshot)(item, date.slice(0, 7)).closing + (initial?.type === 'consumed' ? initial.qty : 0) : 0

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const q = Number(f.get('qty'))
    if (!item || !(q > 0) || !date) return
    if (type === 'consumed' && q > available && !overdraw) {
      setOverdraw(true)
      return
    }
    setPending(true)
    const rateRaw = String(f.get('rate') ?? '')
    const ok = await onSave({
      id: initial?.id,
      itemId: item.id,
      type,
      qty: q,
      date,
      rate: rateRaw === '' ? undefined : Number(rateRaw),
      location: String(f.get('location') ?? ''),
      note: String(f.get('note') ?? ''),
    })
    setPending(false)
    setOverdraw(false)
    if (ok && !initial) {
      ;(form.elements.namedItem('qty') as HTMLInputElement).value = ''
      ;(form.elements.namedItem('location') as HTMLInputElement).value = ''
      ;(form.elements.namedItem('note') as HTMLInputElement).value = ''
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={pending} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Item *" htmlFor="move-item">
            <NativeSelect id="move-item" value={itemId} onChange={(e) => setItemId(e.target.value)} required>
              {snapshot.items.map((i) => (
                <option key={i.id} value={String(i.id)}>
                  {i.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Movement type" htmlFor="move-type">
            <NativeSelect id="move-type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="received">Received / Stock In</option>
              <option value="consumed">Consumed / Stock Out</option>
            </NativeSelect>
          </Field>
          <Field label="Quantity *" htmlFor="move-qty">
            <Input
              id="move-qty"
              name="qty"
              type="number"
              min="0.01"
              step="0.01"
              required
              defaultValue={initial?.qty}
              onChange={() => setOverdraw(false)}
            />
          </Field>
          <Field label="Date *" htmlFor="move-date">
            <Input id="move-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Location / Department" htmlFor="move-location">
            <Input id="move-location" name="location" placeholder="e.g. Block A, Hostel" defaultValue={initial?.location} />
          </Field>
          <Field label="Reference / PACT / Remarks" htmlFor="move-note">
            <Input id="move-note" name="note" placeholder="Invoice, department, remarks" defaultValue={initial?.note} />
          </Field>
          {initial && (
            <Field label="Rate (₹) for this movement" htmlFor="move-rate">
              <Input id="move-rate" name="rate" type="number" min="0" step="0.01" defaultValue={initial.rate} />
            </Field>
          )}
        </div>
        {item && (
          <p className="text-xs text-muted-foreground">
            Available {item.name} in {monthLabel(date.slice(0, 7))}: <strong>{qty(available)} {item.unit}</strong> · Rate ₹
            {item.rate.toFixed(2)}
          </p>
        )}
        {overdraw && (
          <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Consumption exceeds available closing stock. Press save again to record it anyway.
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit">
            {pending && <Loader2 className="animate-spin" />}
            {initial ? 'Save correction' : overdraw ? 'Save anyway' : 'Save movement'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </fieldset>
    </form>
  )
}
