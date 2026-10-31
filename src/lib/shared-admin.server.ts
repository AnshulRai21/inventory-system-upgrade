// Server-only shared administrator login (username + password from environment variables).
// Works alongside Netlify Identity so the register can be managed without inviting individual users.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'

const COOKIE = 'hk_admin'
const MAX_AGE_SECONDS = 60 * 60 * 12

function credentials() {
  const password = process.env.ADMIN_PASSWORD ?? ''
  const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase()
  return { username, password }
}

export function sharedLoginEnabled() {
  return credentials().password.length > 0
}

// Signed with the password itself, so changing ADMIN_PASSWORD signs every shared session out.
function sign(payload: string) {
  return createHmac('sha256', `hk-shared-admin:${credentials().password}`).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function checkSharedLogin(username: string, password: string) {
  const expected = credentials()
  if (!expected.password) return false
  const userOk = safeEqual(username.trim().toLowerCase(), expected.username)
  const passOk = safeEqual(password, expected.password)
  return userOk && passOk
}

export function startSharedSession() {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000
  const payload = `${credentials().username}.${expires}`
  setCookie(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export function endSharedSession() {
  deleteCookie(COOKIE, { path: '/' })
}

/** Returns the shared admin username when the request carries a valid, unexpired shared session. */
export function readSharedSession(): string | null {
  if (!sharedLoginEnabled()) return null
  const raw = getCookie(COOKIE)
  if (!raw) return null
  const cut = raw.lastIndexOf('.')
  const payload = raw.slice(0, cut)
  const signature = raw.slice(cut + 1)
  if (cut < 0 || !safeEqual(signature, sign(payload))) return null
  const [username, expires] = [payload.slice(0, payload.lastIndexOf('.')), Number(payload.slice(payload.lastIndexOf('.') + 1))]
  if (username !== credentials().username || !(expires > Date.now())) return null
  return username
}
