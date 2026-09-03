import { z } from 'zod'
import type { AppDatabase } from '../platform/types.js'

export const ImportPayloadSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  profiles: z.array(z.any()),
  sites: z.array(z.any()),
  racks: z.array(z.any()),
  deviceTemplates: z.array(z.any()),
  devices: z.array(z.any()),
  ports: z.array(z.any()),
  cableLinks: z.array(z.any()),
})

export type ImportPayload = z.infer<typeof ImportPayloadSchema>

export async function executeImport(db: AppDatabase, payload: ImportPayload, mode: 'append' | 'replace') {
  const { profiles, sites, racks, deviceTemplates, devices, ports, cableLinks } = await import('../db/schema.js')

  const idMap = new Map<string, string>()
  const getNewId = (oldId?: string | null) => {
    if (!oldId) return null
    const mapped = idMap.get(oldId)
    if (!mapped) throw new Error(`UUID remapping failed: ${oldId} not found`)
    return mapped
  }

  const toDate = (ts?: number | null) => ts ? new Date(ts) : new Date()

  if (mode === 'replace') {
    await db.delete(cableLinks)
    await db.delete(ports)
    await db.delete(devices)
    await db.delete(deviceTemplates)
    await db.delete(racks)
    await db.delete(sites)
    await db.delete(profiles)
  }

  for (const p of payload.profiles) {
    const newId = crypto.randomUUID()
    idMap.set(p.id, newId)
    await db.insert(profiles).values({ ...p, id: newId, createdAt: toDate(p.createdAt), updatedAt: toDate(p.updatedAt) })
  }

  for (const s of payload.sites) {
    const newId = crypto.randomUUID()
    idMap.set(s.id, newId)
    await db.insert(sites).values({ ...s, id: newId, profileId: getNewId(s.profileId), createdAt: toDate(s.createdAt), updatedAt: toDate(s.updatedAt) })
  }

  for (const r of payload.racks) {
    const newId = crypto.randomUUID()
    idMap.set(r.id, newId)
    await db.insert(racks).values({ ...r, id: newId, siteId: getNewId(r.siteId), createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt) })
  }

  for (const dt of payload.deviceTemplates) {
    const newId = crypto.randomUUID()
    idMap.set(dt.id, newId)
    await db.insert(deviceTemplates).values({ ...dt, id: newId, createdAt: toDate(dt.createdAt), updatedAt: toDate(dt.updatedAt) })
  }

  for (const d of payload.devices) {
    const newId = crypto.randomUUID()
    idMap.set(d.id, newId)
    await db.insert(devices).values({
      ...d,
      id: newId,
      siteId: getNewId(d.siteId),
      rackId: getNewId(d.rackId),
      templateId: getNewId(d.templateId) || d.templateId,
      createdAt: toDate(d.createdAt),
      updatedAt: toDate(d.updatedAt)
    })
  }

  for (const p of payload.ports) {
    const newId = crypto.randomUUID()
    idMap.set(p.id, newId)
    await db.insert(ports).values({
      ...p,
      id: newId,
      deviceId: getNewId(p.deviceId),
      createdAt: toDate(p.createdAt)
    })
  }

  for (const l of payload.cableLinks) {
    const newId = crypto.randomUUID()
    idMap.set(l.id, newId)
    await db.insert(cableLinks).values({
      ...l,
      id: newId,
      portAId: getNewId(l.portAId),
      portBId: getNewId(l.portBId),
      createdAt: toDate(l.createdAt),
      updatedAt: toDate(l.updatedAt)
    })
  }
}
