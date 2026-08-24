import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { sites, racks } from '../db/schema.js'
import type { AppEnv } from '../platform/types.js'

const CreateSchema = z.object({
  profileId:   z.string().uuid(),
  name:        z.string().min(1),
  description: z.string().optional(),
})
const UpdateSchema = CreateSchema.omit({ profileId: true }).partial()

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const db = c.get('db')
  const rows = await db.select().from(sites)
  return c.json(rows)
})

app.post('/', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = CreateSchema.parse(body)
  const [row] = await db.insert(sites).values(input).returning()
  return c.json(row, 201)
})

app.get('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.select().from(sites).where(eq(sites.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.put('/:id', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = UpdateSchema.parse(body)
  const [row] = await db.update(sites)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(sites.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.delete(sites).where(eq(sites.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

// Nested: list racks under a site
app.get('/:id/racks', async (c) => {
  const db = c.get('db')
  const rows = await db.select().from(racks).where(eq(racks.siteId, c.req.param('id')))
  return c.json(rows)
})

app.get('/:id/topology', async (c) => {
  const db = c.get('db')
  const { cableLinks, ports, devices, racks, sites } = await import('../db/schema.js')
  const { alias } = await import('drizzle-orm/sqlite-core')
  const { and, eq, or } = await import('drizzle-orm')

  const siteId = c.req.param('id')
  
  // Get all racks in this site
  const siteRacks = await db.select().from(racks).where(eq(racks.siteId, siteId))
  
  const portA = alias(ports, 'portA')
  const deviceA = alias(devices, 'deviceA')
  const rackA = alias(racks, 'rackA')
  const siteAliasA = alias(sites, 'siteA')

  const portB = alias(ports, 'portB')
  const deviceB = alias(devices, 'deviceB')
  const rackB = alias(racks, 'rackB')
  const siteAliasB = alias(sites, 'siteB')

  // We want links where either end is in this site
  const links = await db.select({
    id: cableLinks.id,
    color: cableLinks.color,
    cableType: cableLinks.cableType,
    notes: cableLinks.notes,
    label: cableLinks.label,
    portASlot: cableLinks.portASlot,
    portBSlot: cableLinks.portBSlot,
    deviceAName: deviceA.name,
    portALabel: portA.label,
    deviceBName: deviceB.name,
    portBLabel: portB.label,
    rackAId: rackA.id,
    rackAName: rackA.name,
    siteAId: siteAliasA.id,
    siteAName: siteAliasA.name,
    rackBId: rackB.id,
    rackBName: rackB.name,
    siteBId: siteAliasB.id,
    siteBName: siteAliasB.name,
  })
  .from(cableLinks)
  .innerJoin(portA, eq(cableLinks.portAId, portA.id))
  .innerJoin(deviceA, eq(portA.deviceId, deviceA.id))
  .innerJoin(rackA, eq(deviceA.rackId, rackA.id))
  .innerJoin(siteAliasA, eq(rackA.siteId, siteAliasA.id))
  .innerJoin(portB, eq(cableLinks.portBId, portB.id))
  .innerJoin(deviceB, eq(portB.deviceId, deviceB.id))
  .innerJoin(rackB, eq(deviceB.rackId, rackB.id))
  .innerJoin(siteAliasB, eq(rackB.siteId, siteAliasB.id))
  .where(
    or(
      eq(siteAliasA.id, siteId),
      eq(siteAliasB.id, siteId)
    )
  )

  const nodes = new Map<string, string>()
  
  // Add all racks in the site as nodes even if they have no links
  for (const rack of siteRacks) {
    nodes.set(`rack_${rack.id.replace(/-/g, '_')}`, `${rack.name}`)
  }

  // To aggregate links: count edges between nodes
  // We'll canonicalize the edge direction to avoid duplicates (e.g. A->B vs B->A)
  const edgeCounts = new Map<string, number>()

  for (const link of links) {
    let nodeA = ''
    let nodeB = ''

    if (link.siteAId === siteId) {
      nodeA = `rack_${link.rackAId.replace(/-/g, '_')}`
    } else {
      nodeA = `site_${link.siteAId.replace(/-/g, '_')}`
      nodes.set(nodeA, `Site: ${link.siteAName}`)
    }

    if (link.siteBId === siteId) {
      nodeB = `rack_${link.rackBId.replace(/-/g, '_')}`
    } else {
      nodeB = `site_${link.siteBId.replace(/-/g, '_')}`
      nodes.set(nodeB, `Site: ${link.siteBName}`)
    }
    
    // Ignore self-loops on the same rack (the prompt says "distinct racks")
    if (nodeA === nodeB) continue

    // Canonicalize edge key
    const edgeKey = [nodeA, nodeB].sort().join(':::')
    edgeCounts.set(edgeKey, (edgeCounts.get(edgeKey) || 0) + 1)
  }

  let mermaidStr = 'graph TD\n'
  for (const [id, name] of nodes.entries()) {
    // Quote names to prevent Mermaid syntax issues
    mermaidStr += `  ${id}["${name.replace(/"/g, '')}"]\n`
  }

  for (const [edgeKey, count] of edgeCounts.entries()) {
    const [nodeA, nodeB] = edgeKey.split(':::')
    mermaidStr += `  ${nodeA} -- "${count} ${count === 1 ? 'Connection' : 'Connections'}" --> ${nodeB}\n`
  }

  const formattedLinks = links.map(l => ({
    id: l.id,
    color: l.color,
    cableType: l.cableType,
    notes: l.notes,
    label: l.label,
    rackAId: l.rackAId,
    rackBId: l.rackBId,
    siteAId: l.siteAId,
    siteBId: l.siteBId,
    endpointA: {
      siteName: l.siteAName,
      rackName: l.rackAName,
      deviceName: l.deviceAName,
      portLabel: l.portALabel,
      slot: l.portASlot
    },
    endpointB: {
      siteName: l.siteBName,
      rackName: l.rackBName,
      deviceName: l.deviceBName,
      portLabel: l.portBLabel,
      slot: l.portBSlot
    }
  }))

  return c.json({ mermaidData: mermaidStr, links: formattedLinks })
})

export default app
