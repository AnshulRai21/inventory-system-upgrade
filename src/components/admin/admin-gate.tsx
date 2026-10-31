import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { KeyRound, Loader2, LockKeyhole } from 'lucide-react'

import { getLoginOptions, getSession, sharedLogin, sharedLogout } from '@/lib/inventory.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/register/shell'

export const CALLBACK_KEYS: string[] = []

export type AdminSession = { email: string; name: string; isAdmin: boolean; shared: boolean }
type GateState = { kind: 'loading' } | { kind: 'signed-out' } | { kind: 'admin'; session: AdminSession }

function authMessage(error: unknown) {
  return error instanceof Error && error.message === 'shared-login-failed' ? 'Invalid username or password.' : 'Something went wrong. Please try again.'
}

export function AdminGate({ children }: { children: (session: AdminSession, signOut: () => void) => ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: 'loading' })
  const resolveSession = useCallback(async () => {
    const session = await getSession()
    setState(session ? { kind: 'admin', session } : { kind: 'signed-out' })
  }, [])
  useEffect(() => { void resolveSession().catch(() => setState({ kind: 'signed-out' })) }, [resolveSession])
  const signOut = useCallback(async () => {
    try { await sharedLogout() } finally { setState({ kind: 'signed-out' }) }
  }, [])
  if (state.kind === 'loading') return <CenteredCard><div className="flex items-center justify-center gap-2 py-8 text-muted-foreground" role="status"><Loader2 className="size-5 animate-spin" /> Checking administrator access…</div></CenteredCard>
  if (state.kind === 'admin') return <>{children(state.session, signOut)}</>
  return <LoginForm onDone={resolveSession} />
export type AdminSession = { email: string; name: string; isAdmin: true; shared: true }

export function AdminGate({ children }: { children: (session: AdminSession, signOut: () => void) => ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const resolveSession = useCallback(async () => {
    const [current, options] = await Promise.all([getSession(), getLoginOptions()])
    setSession(current as AdminSession | null)
    setConfigured(options.shared)
    setLoading(false)
  }, [])

  useEffect(() => { void resolveSession().catch(() => { setConfigured(false); setLoading(false) }) }, [resolveSession])

  const signOut = useCallback(async () => {
    await sharedLogout()
    setSession(null)
  }, [])

  if (loading) return <CenteredCard><div className="flex items-center justify-center gap-2 py-8 text-muted-foreground" role="status"><Loader2 className="size-5 animate-spin" /> Checking administrator access…</div></CenteredCard>
  if (session?.isAdmin) return <>{children(session, signOut)}</>
  return <LoginForm configured={!!configured} onDone={resolveSession} />
}

function CenteredCard({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-20"><div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</div></div>
}

function LoginForm({ onDone }: { onDone: () => Promise<void> }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fields = new FormData(e.currentTarget)
    setPending(true); setError(null)
    try {
      const result = await sharedLogin({ data: { username: String(fields.get('username')).trim(), password: String(fields.get('password')) } })
      if (!result.ok) throw new Error('shared-login-failed')
      await onDone()
    } catch (err) { setError(authMessage(err)) } finally { setPending(false) }
  }
function LoginForm({ configured, onDone }: { configured: boolean; onDone: () => Promise<void> }) {
  const [username, setUsername] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const password = String(new FormData(e.currentTarget).get('password') ?? '')
    setPending(true)
    setError(null)
    try {
      const result = await sharedLogin({ data: { username, password } })
      if (!result.ok) throw new Error('Invalid username or password.')
      await onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return <CenteredCard>
    <div className="mb-6 space-y-2 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-[oklch(0.94_0.03_252)] text-primary"><LockKeyhole className="size-6" /></div>
      <h2 className="text-xl font-extrabold tracking-tight">Administrator sign in</h2>
      <p className="text-sm text-muted-foreground">Only authorised administrators can add items, record stock and manage reports.</p>
    </div>
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
    {!configured && <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Admin login is not configured yet. Set ADMIN_USERNAME and ADMIN_PASSWORD in the Railway service variables, then redeploy.</p>}
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={pending || !configured} className="space-y-4">
        <Field label="Username" htmlFor="login-username"><Input id="login-username" name="username" type="text" autoComplete="username" autoCapitalize="none" required value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
        <Field label="Password" htmlFor="login-password"><Input id="login-password" name="password" type="password" autoComplete="current-password" required /></Field>
        <Button type="submit" className="w-full">{pending ? <Loader2 className="animate-spin" /> : <KeyRound />}{pending ? 'Signing in…' : 'Sign in'}</Button>
      </fieldset>
      {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
      <p className="text-center text-xs text-muted-foreground">To reset access, the system owner must update the administrator credentials in Vercel environment variables.</p>
      <div className="text-center text-sm"><Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">View public register →</Link></div>
      <div className="text-right text-sm"><Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">View public register →</Link></div>
    </form>
  </CenteredCard>
}
