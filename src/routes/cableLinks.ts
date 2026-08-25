import { Hono } from 'hono'
import { z } from 'zod'
import { eq, or, inArray, and, ne } from 'drizzle-orm'
import { cableLinks, ports } from '../db/schema.js'
import type { AppEnv } from '../platform/types.js'

const SlotSchema = z.enum(['front', 'back'])

const CreateSchema = z.object({
  portAId:   z.string().uuid(),
  portASlot: SlotSchema.default('front'),
  portBId:   z.string().uuid(),
  portBSlot: SlotSchema.default('front'),
  cableType: z.string().optional(),
  color:     z.string().optional(),
  label:     z.string().optional(),
  notes:     z.string().optional(),
})

const UpdateSchema = z.object({
  cableType: z.string().optional(),
  color:     z.string().nullable().optional(),
  label:     z.string().nullable().optional(),
  notes:     z.string().nullable().optional(),
  portASlot: SlotSchema.optional(),
  portBSlot: SlotSchema.optional(),
})

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const db = c.get('db')
  const portIds = c.req.queries('portId') ?? []
  if (portIds.length > 0) {
    const rows = []
    const seen = new Set<string>()
    for (let i = 0; i < portIds.length; i += 40) {
      const chunk = portIds.slice(i, i + 40)
      const res = await db.select().from(cableLinks).where(
        or(inArray(cableLinks.portAId, chunk), inArray(cableLinks.portBId, chunk))
      )
      for (const row of res) {
        if (!seen.has(row.id)) {
          seen.add(row.id)
          rows.push(row)
        }
      }
    }
    return c.json(rows)
  }
  const rows = await db.select().from(cableLinks)
  return c.json(rows)
})

app.post('/', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = CreateSchema.parse(body)
  if (input.portAId === input.portBId) {
    return c.json({ error: 'A port cannot link to itself' }, 422)
  }

  // Check if either port slot is already connected
  const existing = await db.select().from(cableLinks).where(
    or(
      or(
        and(eq(cableLinks.portAId, input.portAId), eq(cableLinks.portASlot, input.portASlot)),
        and(eq(cableLinks.portBId, input.portAId), eq(cableLinks.portBSlot, input.portASlot))
      ),
      or(
        and(eq(cableLinks.portAId, input.portBId), eq(cableLinks.portASlot, input.portBSlot)),
        and(eq(cableLinks.portBId, input.portBId), eq(cableLinks.portBSlot, input.portBSlot))
      )
    )
  )

  if (existing.length > 0) {
    return c.json({ error: 'One of these port slots is already connected to another cable.' }, 409)
  }

  const [row] = await db.insert(cableLinks).values(input).returning()
  return c.json(row, 201)
})

app.get('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.select().from(cableLinks).where(eq(cableLinks.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.put('/:id', async (c) => {
  const db = c.get('db')
  const linkId = c.req.param('id')
  const [current] = await db.select().from(cableLinks).where(eq(cableLinks.id, linkId))
  if (!current) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  const input = UpdateSchema.parse(body)

  if (input.portASlot !== undefined || input.portBSlot !== undefined) {
    const targetASlot = input.portASlot ?? current.portASlot
    const targetBSlot = input.portBSlot ?? current.portBSlot

    // Check if either port slot is already connected to another cable
    const existing = await db.select().from(cableLinks).where(
      and(
        ne(cableLinks.id, linkId),
        or(
          or(
            and(eq(cableLinks.portAId, current.portAId), eq(cableLinks.portASlot, targetASlot)),
            and(eq(cableLinks.portBId, current.portAId), eq(cableLinks.portBSlot, targetASlot))
          ),
          or(
            and(eq(cableLinks.portAId, current.portBId), eq(cableLinks.portASlot, targetBSlot)),
            and(eq(cableLinks.portBId, current.portBId), eq(cableLinks.portBSlot, targetBSlot))
          )
        )
      )
    )

    if (existing.length > 0) {
      return c.json({ error: 'One of these port slots is already connected to another cable.' }, 409)
    }
  }

  const [row] = await db.update(cableLinks)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(cableLinks.id, linkId))
    .returning()

  return c.json(row)
})

app.delete('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.delete(cableLinks).where(eq(cableLinks.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

export default app
