import { Hono } from 'hono'
import type { AppEnv } from '../platform/types.js'
import { ImportPayloadSchema, executeImport } from '../services/importService.js'

const app = new Hono<AppEnv>()

app.post('/', async (c) => {
  const config = c.get('config')
  
  if (config.demoMode) {
    return c.json({ error: 'Import is disabled in DEMO_MODE.' }, 403)
  }

  const db = c.get('db')
  const body = await c.req.json()
  const payload = ImportPayloadSchema.parse(body)
  const mode = c.req.query('mode') === 'replace' ? 'replace' : 'append'

  await executeImport(db, payload, mode)

  return c.json({ ok: true })
})

export default app
