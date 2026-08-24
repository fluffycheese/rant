import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { ports } from '../db/schema.js'
import type { AppEnv } from '../platform/types.js'

const CreateSchema = z.object({
  deviceId:      z.string().uuid(),
  label:         z.string().min(1),
  connectorType: z.string().optional(),
  position:      z.number().int().min(0),
  notes:         z.string().optional(),
})
const UpdateSchema = CreateSchema.omit({ deviceId: true }).partial()

const app = new Hono<AppEnv>()

app.get('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.select().from(ports).where(eq(ports.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = CreateSchema.parse(body)
  const [row] = await db.insert(ports).values(input).returning()
  return c.json(row, 201)
})

app.put('/:id', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = UpdateSchema.parse(body)
  const [row] = await db.update(ports)
    .set(input)
    .where(eq(ports.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.delete(ports).where(eq(ports.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

export default app
