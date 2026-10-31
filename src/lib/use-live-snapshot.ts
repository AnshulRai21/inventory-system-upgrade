import { useCallback, useEffect, useRef, useState } from 'react'

import { getSnapshot, getVersion } from './inventory.functions'
import type { Snapshot } from './inventory'

const POLL_MS = 8000

export type SyncStatus = 'live' | 'syncing' | 'offline'

/**
 * Keeps the register in sync with the shared database: polls a tiny version counter and
 * reloads the full snapshot only when an admin has changed something.
 */
export function useLiveSnapshot(initial: Snapshot) {
  const [snapshot, setSnapshot] = useState(initial)
  const [status, setStatus] = useState<SyncStatus>('live')
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const versionRef = useRef(initial.version)

  const reload = useCallback(async () => {
    setStatus('syncing')
    try {
      const next = await getSnapshot()
      versionRef.current = next.version
      setSnapshot(next)
      setStatus('live')
      setLastChecked(new Date())
    } catch {
      setStatus('offline')
    }
  }, [])

  useEffect(() => {
    let active = true
    async function check() {
      if (document.visibilityState === 'hidden') return
      try {
        const v = await getVersion()
        if (!active) return
        setLastChecked(new Date())
        if (v.version !== versionRef.current) await reload()
        else setStatus('live')
      } catch {
        if (active) setStatus('offline')
      }
    }
    const timer = window.setInterval(check, POLL_MS)
    const onFocus = () => void check()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [reload])

  return { snapshot, status, lastChecked, reload }
}
