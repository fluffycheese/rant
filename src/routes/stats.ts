import { Hono } from 'hono'
import { count, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { sites, racks, devices, ports, cableLinks } from '../db/schema.js'
import type { AppEnv } from '../platform/types.js'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const db = c.get('db')

  const portA = alias(ports, 'portA')
  const deviceA = alias(devices, 'deviceA')
  const rackA = alias(racks, 'rackA')
  const siteA = alias(sites, 'siteA')

  const portB = alias(ports, 'portB')
  const deviceB = alias(devices, 'deviceB')
  const rackB = alias(racks, 'rackB')
  const siteB = alias(sites, 'siteB')

  const [
    [sitesRow],
    [racksRow],
    [devicesRow],
    [connectionsRow],
    linksDetails,
  ] = await Promise.all([
    db.select({ count: count() }).from(sites),
    db.select({ count: count() }).from(racks),
    db.select({ count: count() }).from(devices),
    db.select({ count: count() }).from(cableLinks),
    db.select({
      id: cableLinks.id,
      rackAId: rackA.id,
      rackBId: rackB.id,
      siteAId: siteA.id,
      siteBId: siteB.id,
    })
      .from(cableLinks)
      .innerJoin(portA, eq(cableLinks.portAId, portA.id))
      .innerJoin(deviceA, eq(portA.deviceId, deviceA.id))
      .leftJoin(rackA, eq(deviceA.rackId, rackA.id))
      .leftJoin(siteA, eq(rackA.siteId, siteA.id))
      .innerJoin(portB, eq(cableLinks.portBId, portB.id))
      .innerJoin(deviceB, eq(portB.deviceId, deviceB.id))
      .leftJoin(rackB, eq(deviceB.rackId, rackB.id))
      .leftJoin(siteB, eq(rackB.siteId, siteB.id)),
  ])

  let crossRackLinks = 0
  let crossSiteLinks = 0

  for (const link of linksDetails) {
    if (link.rackAId && link.rackBId && link.rackAId !== link.rackBId) {
      crossRackLinks++
    }
    if (link.siteAId && link.siteBId && link.siteAId !== link.siteBId) {
      crossSiteLinks++
    }
  }

  return c.json({
    totalSites: sitesRow?.count ?? 0,
    totalRacks: racksRow?.count ?? 0,
    totalDevices: devicesRow?.count ?? 0,
    totalConnections: connectionsRow?.count ?? 0,
    crossRackLinks,
    crossSiteLinks,
  })
})

export default app
