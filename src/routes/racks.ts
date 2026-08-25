import { Hono } from 'hono'
import { z } from 'zod'
import { eq, or, inArray } from 'drizzle-orm'
import { racks, devices, ports, cableLinks, sites, deviceTemplates } from '../db/schema.js'
import type { AppEnv } from '../platform/types.js'

const CreateSchema = z.object({
  siteId:      z.string().uuid(),
  name:        z.string().min(1),
  description: z.string().optional(),
  uHeight:     z.number().int().min(1).max(100).optional(),
})
const UpdateSchema = CreateSchema.omit({ siteId: true }).partial()

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const db = c.get('db')
  const rows = await db.select().from(racks)
  return c.json(rows)
})

app.post('/', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = CreateSchema.parse(body)
  const [row] = await db.insert(racks).values(input).returning()
  return c.json(row, 201)
})

app.get('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.select().from(racks).where(eq(racks.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.put('/:id', async (c) => {
  const db = c.get('db')
  const body = await c.req.json()
  const input = UpdateSchema.parse(body)
  const [row] = await db.update(racks)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(racks.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.delete('/:id', async (c) => {
  const db = c.get('db')
  const [row] = await db.delete(racks).where(eq(racks.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

// Nested: list devices in a rack
app.get('/:id/devices', async (c) => {
  const db = c.get('db')
  const rows = await db.select().from(devices).where(eq(devices.rackId, c.req.param('id')))
  return c.json(rows)
})

// View composite endpoint — clean payload for rack view rendering
app.get('/:id/view', async (c) => {
  const db = c.get('db')
  const rackId = c.req.param('id')

  // 1. Get rack with site context
  const rackRows = await db
    .select({
      rack: racks,
      site: sites,
    })
    .from(racks)
    .innerJoin(sites, eq(racks.siteId, sites.id))
    .where(eq(racks.id, rackId))

  if (rackRows.length === 0) return c.json({ error: 'Not found' }, 404)
  const { rack, site } = rackRows[0]

  // 2. Get all devices in this rack (with optional template info)
  const deviceRows = await db
    .select({ device: devices, template: deviceTemplates })
    .from(devices)
    .leftJoin(deviceTemplates, eq(devices.templateId, deviceTemplates.id))
    .where(eq(devices.rackId, rackId))

  const deviceIds = deviceRows.map(r => r.device.id)

  // 3. Get all ports for these devices
  const portRows: typeof ports.$inferSelect[] = []
  for (let i = 0; i < deviceIds.length; i += 40) {
    const chunk = deviceIds.slice(i, i + 40)
    const res = await db.select().from(ports).where(inArray(ports.deviceId, chunk))
    portRows.push(...res)
  }

  const portIds = portRows.map(p => p.id)
  const portIdSet = new Set(portIds)

  // 4. Get all internal cable links touching ports in this rack
  const linkRows: typeof cableLinks.$inferSelect[] = []
  const seenLinkIds = new Set<string>()
  for (let i = 0; i < portIds.length; i += 40) {
    const chunk = portIds.slice(i, i + 40)
    const res = await db.select().from(cableLinks).where(
      or(inArray(cableLinks.portAId, chunk), inArray(cableLinks.portBId, chunk))
    )
    for (const row of res) {
      if (!seenLinkIds.has(row.id)) {
        seenLinkIds.add(row.id)
        linkRows.push(row)
      }
    }
  }

  const internalLinks = linkRows // Keep all links! We will let the frontend see cross-site links too.

  // 4b. Find any remote ports and devices involved in cross-site links
  const allPortIdsInLinks = new Set(linkRows.flatMap(l => [l.portAId, l.portBId]))
  const remotePortIds = Array.from(allPortIdsInLinks).filter(id => !portIdSet.has(id))
  
  const remotePortsRows: typeof ports.$inferSelect[] = []
  for (let i = 0; i < remotePortIds.length; i += 40) {
    const chunk = remotePortIds.slice(i, i + 40)
    const res = await db.select().from(ports).where(inArray(ports.id, chunk))
    remotePortsRows.push(...res)
  }
  
  const remoteDeviceIds = [...new Set(remotePortsRows.map(p => p.deviceId))]
  
  const remoteDeviceRows: any[] = []
  for (let i = 0; i < remoteDeviceIds.length; i += 40) {
    const chunk = remoteDeviceIds.slice(i, i + 40)
    const res = await db
      .select({
        device: devices,
        template: deviceTemplates,
        rack: racks,
        site: sites,
      })
      .from(devices)
      .leftJoin(deviceTemplates, eq(devices.templateId, deviceTemplates.id))
      .innerJoin(racks, eq(devices.rackId, racks.id))
      .innerJoin(sites, eq(racks.siteId, sites.id))
      .where(inArray(devices.id, chunk))
    remoteDeviceRows.push(...res)
  }

  // Combine device rows
  const localDeviceRows = deviceRows.map(r => ({
    device: r.device,
    template: r.template,
    rack,
    site,
  }))
  const allDeviceRows = [...localDeviceRows, ...remoteDeviceRows]
  
  // 5. Group ALL ports by device and sort by position
  const portsByDevice = new Map<string, typeof ports.$inferSelect[]>()
  for (const port of [...portRows, ...remotePortsRows]) {
    if (!portsByDevice.has(port.deviceId)) portsByDevice.set(port.deviceId, [])
    portsByDevice.get(port.deviceId)!.push(port)
  }

  for (const [, pList] of portsByDevice) {
    pList.sort((a, b) => a.position - b.position)
  }

  return c.json({
    rack,
    site,
    devices: allDeviceRows.map(r => ({
      ...r.device,
      template: r.template,
      rack: r.rack,
      site: r.site,
      ports: portsByDevice.get(r.device.id) ?? [],
    })),
    internalLinks,
  })
})

export default app
