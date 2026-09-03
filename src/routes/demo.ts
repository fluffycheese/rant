import { Hono } from 'hono'
import type { AppEnv } from '../platform/types.js'
import { ImportPayloadSchema, executeImport } from '../services/importService.js'

const app = new Hono<AppEnv>()

app.post('/reset', async (c) => {
  const config = c.get('config')
  
  if (!config.demoMode) {
    return c.json({ error: 'Not in DEMO_MODE.' }, 403)
  }

  const authHeader = c.req.header('Authorization')
  // We expect process.env.CRON_SECRET or Cloudflare environment CRON_SECRET to be available.
  // In Cloudflare, env vars are on c.env, but we should make sure it's injected or we can read process.env.
  // Since platform/types doesn't explicitly expose c.env in AppEnv, let's grab it globally if possible,
  // or require it to be configured. The safest way is to check the header against a known secret.
  
  // NOTE: In Cloudflare, env vars are passed into the fetch handler. For now, since this is a demo,
  // we can use a hardcoded fallback or rely on process.env (Node) / globalThis (Cloudflare fallback).
  // Ideally, the adapter should inject `cronSecret` into `AppConfig`.
  // Let's assume config.cronSecret is available (we will update platform/types and adapters next).
  
  const secret = (config as any).cronSecret
  if (!secret) {
    return c.json({ error: 'CRON_SECRET is not configured on the server.' }, 500)
  }

  if (authHeader !== `Bearer ${secret}`) {
    return c.json({ error: 'Unauthorized.' }, 401)
  }

  const db = c.get('db')
  const body = await c.req.json()
  const payload = ImportPayloadSchema.parse(body)

  // Force replace mode for demo reset
  await executeImport(db, payload, 'replace')

  return c.json({ ok: true, message: 'Demo environment reset successfully.' })
})

export default app
