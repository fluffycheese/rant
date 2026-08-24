import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { profiles } from '../db/schema.js'
import type { AppEnv } from '../platform/types.js'

const CreateSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
})
const UpdateSchema = CreateSchema.partial()

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const db = c.get('db')
  const rows = await db.select().from(profiles)
  return c.json(rows)
})

app.post('/', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = CreateSchema.parse(body)
  const [row] = await db.insert(profiles).values(input).returning()
  return c.json(row, 201)
})

app.get('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.select().from(profiles).where(eq(profiles.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.put('/:id', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = UpdateSchema.parse(body)
  const [row] = await db.update(profiles)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(profiles.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.delete(profiles).where(eq(profiles.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

// Nested: list sites under a profile
app.get('/:id/sites', async (c) => {
  const db = c.get('db')
  const { sites } = await import('../db/schema.js')
  const rows = await db.select().from(sites).where(eq(sites.profileId, c.req.param('id')))
  return c.json(rows)
})

app.get('/:id/cross-site-links', async (c) => {
  const db = c.get('db')
  const { cableLinks, ports, devices, racks, sites } = await import('../db/schema.js')
  const { alias } = await import('drizzle-orm/sqlite-core')
  const { and, eq, ne } = await import('drizzle-orm')

  const portA = alias(ports, 'portA')
  const deviceA = alias(devices, 'deviceA')
  const rackA = alias(racks, 'rackA')
  const siteA = alias(sites, 'siteA')

  const portB = alias(ports, 'portB')
  const deviceB = alias(devices, 'deviceB')
  const rackB = alias(racks, 'rackB')
  const siteB = alias(sites, 'siteB')

  const results = await db.select({
    id: cableLinks.id,
    color: cableLinks.color,
    cableType: cableLinks.cableType,
    notes: cableLinks.notes,
    label: cableLinks.label,
    portASlot: cableLinks.portASlot,
    portBSlot: cableLinks.portBSlot,
    siteAId: siteA.id,
    rackAId: rackA.id,
    siteBId: siteB.id,
    rackBId: rackB.id,
    siteAName: siteA.name,
    rackAName: rackA.name,
    deviceAName: deviceA.name,
    portALabel: portA.label,
    siteBName: siteB.name,
    rackBName: rackB.name,
    deviceBName: deviceB.name,
    portBLabel: portB.label,
  })
  .from(cableLinks)
  .innerJoin(portA, eq(cableLinks.portAId, portA.id))
  .innerJoin(deviceA, eq(portA.deviceId, deviceA.id))
  .innerJoin(rackA, eq(deviceA.rackId, rackA.id))
  .innerJoin(siteA, eq(rackA.siteId, siteA.id))
  .innerJoin(portB, eq(cableLinks.portBId, portB.id))
  .innerJoin(deviceB, eq(portB.deviceId, deviceB.id))
  .innerJoin(rackB, eq(deviceB.rackId, rackB.id))
  .innerJoin(siteB, eq(rackB.siteId, siteB.id))
  .where(
    and(
      eq(siteA.profileId, c.req.param('id')),
      ne(siteA.id, siteB.id)
    )
  )

  const mapped = results.map(row => ({
    id: row.id,
    color: row.color,
    cableType: row.cableType,
    notes: row.notes,
    label: row.label,
    siteAId: row.siteAId,
    siteBId: row.siteBId,
    rackAId: row.rackAId,
    rackBId: row.rackBId,
    endpointA: {
      siteName: row.siteAName,
      rackName: row.rackAName,
      deviceName: row.deviceAName,
      portLabel: row.portALabel,
      slot: row.portASlot,
    },
    endpointB: {
      siteName: row.siteBName,
      rackName: row.rackBName,
      deviceName: row.deviceBName,
      portLabel: row.portBLabel,
      slot: row.portBSlot,
    }
  }))

  return c.json(mapped)
})

app.get('/:id/topology', async (c) => {
  const db = c.get('db')
  const { cableLinks, ports, devices, racks, sites } = await import('../db/schema.js')
  const { alias } = await import('drizzle-orm/sqlite-core')
  const { and, eq, ne } = await import('drizzle-orm')

  const portA = alias(ports, 'portA')
  const deviceA = alias(devices, 'deviceA')
  const rackA = alias(racks, 'rackA')
  const siteA = alias(sites, 'siteA')

  const portB = alias(ports, 'portB')
  const deviceB = alias(devices, 'deviceB')
  const rackB = alias(racks, 'rackB')
  const siteB = alias(sites, 'siteB')

  // We want links where both ends are in the same profile but different sites
  const links = await db.select({
    siteAId: siteA.id,
    siteBId: siteB.id,
  })
  .from(cableLinks)
  .innerJoin(portA, eq(cableLinks.portAId, portA.id))
  .innerJoin(deviceA, eq(portA.deviceId, deviceA.id))
  .innerJoin(rackA, eq(deviceA.rackId, rackA.id))
  .innerJoin(siteA, eq(rackA.siteId, siteA.id))
  .innerJoin(portB, eq(cableLinks.portBId, portB.id))
  .innerJoin(deviceB, eq(portB.deviceId, deviceB.id))
  .innerJoin(rackB, eq(deviceB.rackId, rackB.id))
  .innerJoin(siteB, eq(rackB.siteId, siteB.id))
  .where(
    and(
      eq(siteA.profileId, c.req.param('id')),
      ne(siteA.id, siteB.id)
    )
  )

  const nodes = new Map<string, string>()
  const edgeCounts = new Map<string, number>()

  // Also include all sites in this profile so even isolated ones show up
  const profileSites = await db.select().from(sites).where(eq(sites.profileId, c.req.param('id')))
  for (const site of profileSites) {
    nodes.set(`site_${site.id.replace(/-/g, '_')}`, `Site: ${site.name}`)
  }

  for (const link of links) {
    const nodeA = `site_${link.siteAId.replace(/-/g, '_')}`
    const nodeB = `site_${link.siteBId.replace(/-/g, '_')}`
    
    // Canonicalize edge key
    const edgeKey = [nodeA, nodeB].sort().join(':::')
    edgeCounts.set(edgeKey, (edgeCounts.get(edgeKey) || 0) + 1)
  }

  let mermaidStr = 'graph TD\n'
  for (const [id, name] of nodes.entries()) {
    mermaidStr += `  ${id}["${name.replace(/"/g, '')}"]\n`
  }

  for (const [edgeKey, count] of edgeCounts.entries()) {
    const [nodeA, nodeB] = edgeKey.split(':::')
    mermaidStr += `  ${nodeA} -- "${count} ${count === 1 ? 'Connection' : 'Connections'}" --> ${nodeB}\n`
  }

  return c.json({ mermaidData: mermaidStr })
})

export default app
