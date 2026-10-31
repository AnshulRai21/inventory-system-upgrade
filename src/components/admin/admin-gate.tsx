import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  AuthError,
  MissingIdentityError,
  acceptInvite,
  handleAuthCallback,
  login,
  logout,
  requestPasswordRecovery,
  updateUser,
} from '@netlify/identity'
import { Link } from '@tanstack/react-router'
import { KeyRound, Loader2, LockKeyhole, ShieldAlert } from 'lucide-react'

import { getSession, sharedLogin, sharedLogout } from '@/lib/inventory.functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/register/shell'

export type AdminSession = { email: string; name: string; isAdmin: boolean; shared: boolean }

type GateState =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'invite'; token: string }
  | { kind: 'recovery' }
  | { kind: 'not-admin'; session: AdminSession }
  | { kind: 'admin'; session: AdminSession }

export const CALLBACK_KEYS = ['confirmation_token', 'recovery_token', 'invite_token', 'email_change_token', 'access_token']

function authMessage(error: unknown) {
  if (error instanceof MissingIdentityError) return 'Sign-in is not available yet. Identity is not enabled for this site.'
  if (error instanceof AuthError) {
    if (error.status === 401 || error.status === 400) return 'Invalid email or password.'
    if (error.status === 422) return 'Please check the details and try again (passwords need at least 8 characters).'
    return error.message
  }
  if (error instanceof Error && error.message === 'shared-login-failed') return 'Invalid username or password.'
  return 'Something went wrong. Please try again.'
}

/** Renders children only for signed-in users whose server-verified roles include admin. */
export function AdminGate({ children }: { children: (session: AdminSession, signOut: () => void) => ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: 'loading' })

  const resolveSession = useCallback(async () => {
    const session = await getSession()
    if (!session) setState({ kind: 'signed-out' })
    else setState({ kind: session.isAdmin ? 'admin' : 'not-admin', session })
  }, [])

  useEffect(() => {
    async function init() {
      try {
        const params = new URLSearchParams(window.location.hash.slice(1))
        if (CALLBACK_KEYS.some((k) => params.has(k))) {
          const result = await handleAuthCallback()
          if (result?.type === 'invite' && result.token) return setState({ kind: 'invite', token: result.token })
          if (result?.type === 'recovery') return setState({ kind: 'recovery' })
        }
        await resolveSession()
      } catch {
        setState({ kind: 'signed-out' })
      }
    }
    void init()
  }, [resolveSession])

  const signOut = useCallback(async () => {
    try {
      await sharedLogout()
      await logout().catch(() => undefined)
    } finally {
      setState({ kind: 'signed-out' })
    }
  }, [])

  if (state.kind === 'loading') {
    return (
      <CenteredCard>
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground" role="status">
          <Loader2 className="size-5 animate-spin" /> Checking administrator access…
        </div>
      </CenteredCard>
    )
  }
  if (state.kind === 'admin') return <>{children(state.session, signOut)}</>
  if (state.kind === 'not-admin') {
    return (
      <CenteredCard>
        <div className="space-y-4 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="text-lg font-bold">Administrator access required</h2>
          <p className="text-sm text-muted-foreground">
            You are signed in as <strong>{state.session.email}</strong>, but this account has not been granted the
            administrator role. Ask an existing administrator to assign it.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/">Open public view</Link>
            </Button>
            <Button onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </CenteredCard>
    )
  }
  if (state.kind === 'invite') return <SetPasswordForm mode="invite" token={state.token} onDone={resolveSession} />
  if (state.kind === 'recovery') return <SetPasswordForm mode="recovery" onDone={resolveSession} />
  return <LoginForm onDone={resolveSession} />
}

function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</div>
    </div>
  )
}

function LoginForm({ onDone }: { onDone: () => Promise<void> }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fields = new FormData(e.currentTarget)
    setPending(true)
    setError(null)
    try {
      const id = String(fields.get('email')).trim()
      const password = String(fields.get('password'))
      // Anything without an @ is the shared administrator username; emails go to Netlify Identity.
      if (!id.includes('@')) {
        const result = await sharedLogin({ data: { username: id, password } })
        if (!result.ok) throw new Error('shared-login-failed')
      } else {
        await login(id, password)
      }
      await onDone()
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setPending(false)
    }
  }

  async function forgot() {
    if (!email.includes('@'))
      return setError('Enter your email address first. The shared admin password is changed in the Netlify dashboard.')
    setError(null)
    try {
      await requestPasswordRecovery(email)
      setNotice('If that address belongs to an administrator, a password reset link is on its way.')
    } catch (err) {
      setError(authMessage(err))
    }
  }

  return (
    <CenteredCard>
      <div className="mb-6 space-y-2 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-[oklch(0.94_0.03_252)] text-primary">
          <LockKeyhole className="size-6" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight">Administrator sign in</h2>
        <p className="text-sm text-muted-foreground">
          Only authorised administrators can add items, record stock and manage reports.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4">
          <Field label="Username or email" htmlFor="login-email">
            <Input
              id="login-email"
              name="email"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="login-password">
            <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Button type="submit" className="w-full">
            {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </fieldset>
        {error && (
          <p role="alert" className="text-center text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-center text-sm text-emerald-700">
            {notice}
          </p>
        )}
        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={forgot} className="text-muted-foreground underline-offset-4 hover:underline">
            Forgot password?
          </button>
          <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
            View public register →
          </Link>
        </div>
      </form>
    </CenteredCard>
  )
}

function SetPasswordForm({
  mode,
  token,
  onDone,
}: {
  mode: 'invite' | 'recovery'
  token?: string
  onDone: () => Promise<void>
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fields = new FormData(e.currentTarget)
    const password = String(fields.get('password'))
    if (password !== String(fields.get('confirm'))) return setError('Passwords do not match.')
    setPending(true)
    setError(null)
    try {
      if (mode === 'invite' && token) await acceptInvite(token, password)
      else await updateUser({ password })
      history.replaceState(null, '', window.location.pathname)
      await onDone()
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <CenteredCard>
      <div className="mb-6 space-y-2 text-center">
        <h2 className="text-xl font-extrabold tracking-tight">
          {mode === 'invite' ? 'Accept administrator invite' : 'Set a new password'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {mode === 'invite'
            ? 'Choose a password to activate your administrator account.'
            : 'Enter a new password for your administrator account.'}
        </p>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={pending} className="space-y-4">
          <Field label="New password" htmlFor="new-password">
            <Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Confirm password" htmlFor="confirm-password">
            <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <Button type="submit" className="w-full">
            {pending && <Loader2 className="animate-spin" />}
            {mode === 'invite' ? 'Activate account' : 'Save password'}
          </Button>
          {error && (
            <p role="alert" className="text-center text-sm text-destructive">
              {error}
            </p>
          )}
        </fieldset>
      </form>
    </CenteredCard>
  )
}
