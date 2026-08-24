import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { deviceTemplates, devices, ports } from '../db/schema.js'
import type { AppEnv } from '../platform/types.js'

const PortDefSchema = z.object({
  label:         z.string().min(1),
  connectorType: z.string().default('rj45'),
  position:      z.number().int().min(0),
  groupName:     z.string().nullable().optional(),
  groupLayout:   z.enum(['single_row', 'double_row']).nullable().optional(),
})

const CreateSchema = z.object({
  name:         z.string().min(1),
  category:     z.string().min(1),
  manufacturer: z.string().optional(),
  model:        z.string().optional(),
  portCount:    z.number().int().min(1),
  portLayout:   z.array(PortDefSchema),
  uHeight:      z.number().int().min(1).default(1),
  color:        z.string().default('#4a9eff'),
})
const UpdateSchema = CreateSchema.partial()

const InstantiateSchema = z.object({
  rackId:    z.string().uuid(),
  name:      z.string().min(1),
  positionU: z.number().int().optional(),
  canvasX:   z.number().default(50),
  canvasY:   z.number().default(50),
})

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const db = c.get('db')
  const rows = await db.select().from(deviceTemplates)
  return c.json(rows)
})

app.post('/', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = CreateSchema.parse(body)
  const [row] = await db.insert(deviceTemplates).values(input).returning()
  return c.json(row, 201)
})

app.get('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.select().from(deviceTemplates).where(eq(deviceTemplates.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.put('/:id', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = UpdateSchema.parse(body)
  const [row] = await db.update(deviceTemplates)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(deviceTemplates.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.delete(deviceTemplates)
    .where(eq(deviceTemplates.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

// Instantiate a template into a rack: creates Device + Ports
app.post('/:id/instantiate', async (c) => {
  const db = c.get('db')
  const [template] = await db.select().from(deviceTemplates)
    .where(eq(deviceTemplates.id, c.req.param('id')))
  if (!template) return c.json({ error: 'Template not found' }, 404)

  const body = await c.req.json()
  const input = InstantiateSchema.parse(body)

  const portLayout = template.portLayout as { label: string; connectorType: string; position: number; groupName?: string | null; groupLayout?: 'single_row' | 'double_row' | null }[]

  // Insert device first, then ports
  const [device] = await db.insert(devices).values({
    rackId:     input.rackId,
    templateId: template.id,
    name:       input.name,
    category:   template.category,
    positionU:  input.positionU,
    color:      template.color,
  }).returning()

  const devicePorts = portLayout.map(p => ({
    deviceId:      device.id,
    label:         p.label,
    connectorType: p.connectorType,
    position:      p.position,
    groupName:     p.groupName || null,
    groupLayout:   p.groupLayout || null,
  }))

  const insertedPorts = devicePorts.length > 0
    ? await db.insert(ports).values(devicePorts).returning()
    : []

  return c.json({ device, ports: insertedPorts }, 201)
})

export default app
