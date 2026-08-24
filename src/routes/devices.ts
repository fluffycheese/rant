import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { devices, ports } from '../db/schema.js'
import type { AppEnv } from '../platform/types.js'

const CreateSchema = z.object({
  rackId:     z.string().uuid(),
  templateId: z.string().uuid().optional(),
  name:       z.string().min(1),
  category:   z.string().min(1),
  positionU:  z.number().int().nullable().optional(),
  canvasX:    z.number().optional(),
  canvasY:    z.number().optional(),
  color:      z.string().optional(),
  notes:      z.string().optional(),
})
const UpdateSchema = CreateSchema.omit({ rackId: true }).partial()
const PositionSchema = z.object({ x: z.number(), y: z.number() })

const app = new Hono<AppEnv>()

app.get('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.select().from(devices).where(eq(devices.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = CreateSchema.parse(body)
  const [row] = await db.insert(devices).values(input).returning()
  return c.json(row, 201)
})

app.put('/:id', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = UpdateSchema.parse(body)
  const [row] = await db.update(devices)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(devices.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

// Lightweight position-only update (called on canvas drag-end)
app.patch('/:id/position', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const { x, y } = PositionSchema.parse(body)
  const [row] = await db.update(devices)
    .set({ updatedAt: new Date() })
    .where(eq(devices.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

app.delete('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.delete(devices).where(eq(devices.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

// Nested: list ports for a device
app.get('/:id/ports', async (c) => {
  const db = c.get('db')
  const rows = await db.select().from(ports)
    .where(eq(ports.deviceId, c.req.param('id')))
    .orderBy(ports.position)
  return c.json(rows)
})

export default app
