import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ClipboardList, Eye, ShieldCheck } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { SyncStatus } from '@/lib/use-live-snapshot'

export function AppHeader({
  mode,
  status,
  lastChecked,
  children,
}: {
  mode: 'public' | 'admin'
  status: SyncStatus
  lastChecked: Date | null
  children?: ReactNode
}) {
  return (
    <header className="no-print relative overflow-hidden bg-[oklch(0.3_0.08_252)] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 28px)',
        }}
      />
      <div className="relative mx-auto flex max-w-(--content-width) flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <ClipboardList className="size-6 text-[oklch(0.85_0.12_85)]" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">Housekeeping Digital Inventory Register</h1>
            <p className="text-xs text-white/70 sm:text-sm">
              Guest Supplies &amp; Consumables · Monthly stock, receipts, consumption and closing balance
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncBadge status={status} lastChecked={lastChecked} />
          <nav className="flex rounded-lg bg-white/10 p-1 text-sm ring-1 ring-white/15">
            <Link
              to="/"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition',
                mode === 'public' ? 'bg-white text-[oklch(0.3_0.08_252)]' : 'text-white/80 hover:text-white',
              )}
            >
              <Eye className="size-4" /> Public view
            </Link>
            <Link
              to="/admin"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition',
                mode === 'admin' ? 'bg-white text-[oklch(0.3_0.08_252)]' : 'text-white/80 hover:text-white',
              )}
            >
              <ShieldCheck className="size-4" /> Admin
            </Link>
          </nav>
          {children}
        </div>
      </div>
    </header>
  )
}

export function SyncBadge({ status, lastChecked }: { status: SyncStatus; lastChecked: Date | null }) {
  const label = status === 'live' ? 'Live' : status === 'syncing' ? 'Updating…' : 'Reconnecting'
  return (
    <span
      className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium ring-1 ring-white/15"
      title={lastChecked ? `Last checked ${lastChecked.toLocaleTimeString()}` : 'Synced with the shared register'}
      role="status"
    >
      <span className="relative flex size-2">
        {status === 'live' && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn(
            'relative inline-flex size-2 rounded-full',
            status === 'live' ? 'bg-emerald-400' : status === 'syncing' ? 'bg-sky-300' : 'bg-amber-400',
          )}
        />
      </span>
      {label}
    </span>
  )
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-2xl border bg-card shadow-xs', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-base font-bold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
