import { Hono } from 'hono'
import type { AppEnv } from '../platform/types.js'

const app = new Hono<AppEnv>()

app.get('/', async (c) => {
  const db = c.get('db')
  const { profiles, sites, racks, deviceTemplates, devices, ports, cableLinks } = await import('../db/schema.js')

  // We fetch everything except users and sessions.
  const [
    allProfiles,
    allSites,
    allRacks,
    allTemplates,
    allDevices,
    allPorts,
    allLinks
  ] = await Promise.all([
    db.select().from(profiles),
    db.select().from(sites),
    db.select().from(racks),
    db.select().from(deviceTemplates),
    db.select().from(devices),
    db.select().from(ports),
    db.select().from(cableLinks),
  ])

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles: allProfiles,
    sites: allSites,
    racks: allRacks,
    deviceTemplates: allTemplates,
    devices: allDevices,
    ports: allPorts,
    cableLinks: allLinks,
  }

  return c.json(payload)
})

export default app
