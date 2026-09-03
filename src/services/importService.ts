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

  const chunkInsert = async (table: any, vals: any[]) => {
    // D1 historically has a limit of 100 parameters per query in some setups
    // chunkSize of 8 ensures we stay under 100 even with 12 columns (8 * 12 = 96)
    const chunkSize = 8
    for (let i = 0; i < vals.length; i += chunkSize) {
      await db.insert(table).values(vals.slice(i, i + chunkSize))
    }
  }

  if (payload.profiles.length > 0) {
    const vals = payload.profiles.map((p: any) => {
      const newId = crypto.randomUUID()
      idMap.set(p.id, newId)
      return { ...p, id: newId, isProtected: mode === 'replace', createdAt: toDate(p.createdAt), updatedAt: toDate(p.updatedAt) }
    })
    await chunkInsert(profiles, vals)
  }

  if (payload.sites.length > 0) {
    const vals = payload.sites.map((s: any) => {
      const newId = crypto.randomUUID()
      idMap.set(s.id, newId)
      return { ...s, id: newId, profileId: getNewId(s.profileId), isProtected: mode === 'replace', createdAt: toDate(s.createdAt), updatedAt: toDate(s.updatedAt) }
    })
    await chunkInsert(sites, vals)
  }

  if (payload.racks.length > 0) {
    const vals = payload.racks.map((r: any) => {
      const newId = crypto.randomUUID()
      idMap.set(r.id, newId)
      return { ...r, id: newId, siteId: getNewId(r.siteId), isProtected: mode === 'replace', createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt) }
    })
    await chunkInsert(racks, vals)
  }

  if (payload.deviceTemplates.length > 0) {
    const vals = payload.deviceTemplates.map((dt: any) => {
      const newId = crypto.randomUUID()
      idMap.set(dt.id, newId)
      return { ...dt, id: newId, isProtected: mode === 'replace', createdAt: toDate(dt.createdAt), updatedAt: toDate(dt.updatedAt) }
    })
    await chunkInsert(deviceTemplates, vals)
  }

  if (payload.devices.length > 0) {
    const vals = payload.devices.map((d: any) => {
      const newId = crypto.randomUUID()
      idMap.set(d.id, newId)
      return {
        ...d,
        id: newId,
        siteId: getNewId(d.siteId),
        rackId: getNewId(d.rackId),
        templateId: getNewId(d.templateId) || d.templateId,
        isProtected: mode === 'replace',
        createdAt: toDate(d.createdAt),
        updatedAt: toDate(d.updatedAt)
      }
    })
    await chunkInsert(devices, vals)
  }

  if (payload.ports.length > 0) {
    const vals = payload.ports.map((p: any) => {
      const newId = crypto.randomUUID()
      idMap.set(p.id, newId)
      return {
        ...p,
        id: newId,
        deviceId: getNewId(p.deviceId),
        isProtected: mode === 'replace',
        createdAt: toDate(p.createdAt)
      }
    })
    await chunkInsert(ports, vals)
  }

  if (payload.cableLinks.length > 0) {
    const vals = payload.cableLinks.map((l: any) => {
      const newId = crypto.randomUUID()
      idMap.set(l.id, newId)
      return {
        ...l,
        id: newId,
        portAId: getNewId(l.portAId),
        portBId: getNewId(l.portBId),
        isProtected: mode === 'replace',
        createdAt: toDate(l.createdAt),
        updatedAt: toDate(l.updatedAt)
      }
    })
    await chunkInsert(cableLinks, vals)
  }
}
