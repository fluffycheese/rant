import { Hono } from 'hono'
import type { AppEnv } from '../platform/types.js'
import { resetDemoEnvironment } from '../services/demoService.js'

const app = new Hono<AppEnv>()

app.post('/reset', async (c) => {
  const config = c.get('config')
  
  if (!config.demoMode) {
    return c.json({ error: 'Not in DEMO_MODE.' }, 403)
  }

  const authHeader = c.req.header('Authorization')
  
  const secret = (config as any).cronSecret
  if (!secret) {
    return c.json({ error: 'CRON_SECRET is not configured on the server.' }, 500)
  }

  if (authHeader !== `Bearer ${secret}`) {
    return c.json({ error: 'Unauthorized.' }, 401)
  }

  const db = c.get('db')
  await resetDemoEnvironment(db)

  return c.json({ ok: true, message: 'Demo environment reset successfully.' })
})

export default app
