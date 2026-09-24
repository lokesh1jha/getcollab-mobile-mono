#!/usr/bin/env node
// Ensures the two accounts the Maestro flows sign in with exist on the local
// getcollab-go stack, fully onboarded. Idempotent: existing accounts are only
// re-onboarded if an earlier run left onboarding incomplete.
//
// Uses the same test-harness shortcut as getcollab/tests/e2e/influencer/live-api.ts:
// email OTPs are read from iam.otp_challenge (a bare sha256 of the 6-digit code)
// instead of an inbox. The only database access is that SELECT.
//
//   node scripts/maestro-seed.mjs
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const API = process.env.MAESTRO_API ?? 'http://localhost:4000/v1'
const PG_CONTAINER = process.env.E2E_PG_CONTAINER ?? 'getcollab-postgres-1'
export const PASSWORD = 'Passw0rd!23'
export const BRAND = { email: 'maestro.brand@test.local', name: 'Maestro Brand', role: 'brand' }
export const CREATOR = { email: 'maestro.creator@test.local', name: 'Maestro Creator', role: 'influencer' }

const HEADERS = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function call(path, init = {}, cookie) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${API}${path}`, { ...init, headers: { ...HEADERS, ...(cookie ? { cookie } : {}) } })
    if (res.status !== 429) return res
    await sleep(2000 * (i + 1)) // auth routes are per-IP rate limited
  }
  throw new Error(`${path}: still rate limited`)
}

function latestOtp(email) {
  const hash = execFileSync('docker', ['exec', PG_CONTAINER, 'psql', '-U', 'getcollab', '-d', 'getcollab', '-t', '-A', '-c',
    `select code_hash from iam.otp_challenge where email='${email}' and purpose='email_verify' order by created_at desc limit 1`,
  ], { encoding: 'utf8' }).trim()
  if (!hash) throw new Error(`no OTP row for ${email}`)
  for (let i = 0; i < 1_000_000; i++) {
    const code = String(i).padStart(6, '0')
    if (createHash('sha256').update(code).digest('hex') === hash) return code
  }
  throw new Error(`could not recover OTP for ${email}`)
}

async function login(email) {
  const res = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: PASSWORD }) })
  if (!res.ok) return null
  return (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
}

async function must(res, what) {
  if (!res.ok) throw new Error(`${what} → ${res.status}: ${await res.text()}`)
}

async function onboard(u, cookie) {
  const patch = (step, body) => call('/onboarding', { method: 'PATCH', body: JSON.stringify({ role: u.role, step, patch: body }) }, cookie)
  await must(await call('/auth/accept-terms', { method: 'POST', body: JSON.stringify({ version: 'v1' }) }, cookie), 'accept terms')
  if (u.role === 'brand') {
    await must(await patch('brand.profile', { profile: { companyName: u.name, website: 'https://example.com' } }), 'brand profile')
    await must(await patch('brand.scale', { scale: { termsAccepted: true } }), 'brand scale')
  } else {
    // categories and languages are required, or the creator profile is silently not created.
    await must(await patch('influencer.profile', { profile: {
      firstName: 'Maestro', lastName: 'Creator', name: u.name, bio: 'Maestro test creator', country: 'IN',
      state: 'Maharashtra', city: 'Mumbai', gender: 'female', categories: ['fashion'], languages: ['en'],
    } }), 'creator profile')
    await must(await patch('influencer.socials', { socials: { instagram: { handle: '@maestro.creator', followers: 1000 } } }), 'creator socials')
  }
  await must(await call('/onboarding/complete', { method: 'POST', body: '{}' }, cookie), 'complete onboarding')
  if (u.role === 'brand') await call('/subscriptions/start-trial', { method: 'POST', body: '{}' }, cookie)
}

async function ensure(u) {
  const existing = await login(u.email)
  if (existing) {
    const me = await (await call('/auth/me', {}, existing)).json().catch(() => ({}))
    if (!(me.user ?? me).onboarding?.complete) await onboard(u, existing)
    return console.log(`✓ ${u.email} (exists)`)
  }
  const signup = await call('/auth/signup', { method: 'POST', body: JSON.stringify({ ...u, password: PASSWORD }) })
  if (signup.status !== 201) throw new Error(`signup ${u.email} → ${signup.status}: ${await signup.text()}`)
  await must(await call('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email: u.email, code: latestOtp(u.email) }) }), 'verify email')
  const cookie = await login(u.email)
  if (!cookie) throw new Error(`login ${u.email} failed after signup`)
  await onboard(u, cookie)
  console.log(`✓ ${u.email} (created)`)
}

await ensure(BRAND)
await ensure(CREATOR)
