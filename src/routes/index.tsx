import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Eye, RefreshCw } from 'lucide-react'

import { getSnapshot } from '@/lib/inventory.functions'
import { useLiveSnapshot } from '@/lib/use-live-snapshot'
import { AppHeader } from '@/components/register/shell'
import { CALLBACK_KEYS } from '@/components/admin/admin-gate'
import { RegisterWorkspace } from '@/components/register/workspace'

export const Route = createFileRoute('/')({
  loader: () => getSnapshot(),
  component: PublicRegister,
})

function PublicRegister() {
  const initial = Route.useLoaderData()
  const { snapshot, status, lastChecked } = useLiveSnapshot(initial)

  // Invite and password-reset emails link to the site root; hand them to the admin sign-in.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    if (CALLBACK_KEYS.some((k) => params.has(k))) window.location.replace('/admin' + window.location.hash)
  }, [])

  return (
    <div className="min-h-screen">
      <AppHeader mode="public" status={status} lastChecked={lastChecked} />
      <main className="mx-auto max-w-(--content-width) space-y-5 px-4 py-6 sm:px-6">
        <div className="no-print flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-sky-900">
          <Eye className="size-4 shrink-0" />
          <span className="flex-1">
            <strong>Public view.</strong> This register is read-only. Stock levels, receipts and consumption update
            automatically whenever an administrator records a change.
          </span>
          <span className="flex items-center gap-1.5 text-xs text-sky-800/80" suppressHydrationWarning>
            <RefreshCw className="size-3.5" />
            {snapshot.updatedAt && new Date(snapshot.updatedAt).getTime() > 0
              ? `Last updated ${new Date(snapshot.updatedAt).toLocaleString('en-IN')}`
              : 'Synced with the shared register'}
          </span>
        </div>
        <RegisterWorkspace snapshot={snapshot} />
      </main>
    </div>
  )
}
