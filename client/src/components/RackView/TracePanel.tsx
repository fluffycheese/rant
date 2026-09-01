import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import type { CableLink, RackDevice, RackViewPayload, Port } from '../../api/client.ts'
import { api } from '../../api/client.ts'
import { usePatching } from '../../contexts/PatchingContext.tsx'

// ── Types ─────────────────────────────────────────────────────────────────────

type HopEndpoint = {
  device: RackDevice
  port: Port
  slot: 'front' | 'back'
}

type TraceHop = {
  link: CableLink
  from: HopEndpoint
  to: HopEndpoint
}

type TraceResult = {
  hops: TraceHop[]
  origin: HopEndpoint
  terminus: HopEndpoint
}

type RackCache = Map<string, RackViewPayload>

// ── Trace helpers ─────────────────────────────────────────────────────────────

function buildPortLookup(payload: RackViewPayload): Map<string, { device: RackDevice; port: Port }> {
  const map = new Map<string, { device: RackDevice; port: Port }>()
  for (const device of payload.devices) {
    for (const port of device.ports) {
      map.set(port.id, { device, port })
    }
  }
  return map
}

function findLink(portId: string, slot: 'front' | 'back', allLinks: CableLink[][]): CableLink | undefined {
  for (const links of allLinks) {
    const found = links.find(
      l => (l.portAId === portId && l.portASlot === slot) || (l.portBId === portId && l.portBSlot === slot)
    )
    if (found) return found
  }
}

function getOtherSide(link: CableLink, fromPortId: string, fromSlot: 'front' | 'back'): { portId: string; slot: 'front' | 'back' } {
  if (link.portAId === fromPortId && link.portASlot === fromSlot) {
    return { portId: link.portBId, slot: link.portBSlot }
  }
  return { portId: link.portAId, slot: link.portASlot }
}

function passthroughSlot(slot: 'front' | 'back'): 'front' | 'back' {
  return slot === 'front' ? 'back' : 'front'
}

function resolvePort(portId: string, portLookups: Map<string, Map<string, { device: RackDevice; port: Port }>>): { device: RackDevice; port: Port } | undefined {
  for (const lookup of portLookups.values()) {
    const result = lookup.get(portId)
    if (result) return result
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  originPortId: string
  originSlot: 'front' | 'back'
  currentPayload: RackViewPayload
  onNavigateToRack?: (rackId: string, highlightLinkId: string) => void
  onOpenSplitView?: (rackId: string, highlightLinkId: string) => void
}

export default function TracePanel({ originPortId, originSlot, currentPayload, onNavigateToRack, onOpenSplitView }: Props) {
  const { setHighlightedLinkId, setPinnedLinkId } = usePatching()
  const [trace, setTrace] = useState<TraceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedHopIndex, setSelectedHopIndex] = useState<number | null>(null)

  const [rackCache] = useState<RackCache>(() => {
    const cache = new Map<string, RackViewPayload>()
    cache.set(currentPayload.rack.id, currentPayload)
    return cache
  })

  useEffect(() => { rackCache.set(currentPayload.rack.id, currentPayload) }, [currentPayload, rackCache])

  const runTrace = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelectedHopIndex(null)
    try {
      const portLookups = new Map<string, Map<string, { device: RackDevice; port: Port }>>()
      for (const [rackId, payload] of rackCache.entries()) {
        portLookups.set(rackId, buildPortLookup(payload))
      }

      async function ensureRack(rackId: string): Promise<void> {
        if (rackCache.has(rackId)) return
        const payload = await api.racks.view(rackId)
        rackCache.set(rackId, payload)
        portLookups.set(rackId, buildPortLookup(payload))
      }

      const getAllLinks = () => Array.from(rackCache.values()).map(p => p.internalLinks)

      const originEntry = resolvePort(originPortId, portLookups)
      if (!originEntry) throw new Error('Could not resolve origin port')

      // ── Bidirectional walk ─────────────────────────────────────────────
      // Walk from startPortId:startSlot forward until a non-PP terminal or
      // an unresolvable port. Returns the ordered hops in traversal order.
      async function walkDirection(
        startPortId: string,
        startSlot: 'front' | 'back'
      ): Promise<TraceHop[]> {
        const hops: TraceHop[] = []
        let currentPortId = startPortId
        let currentSlot: 'front' | 'back' = startSlot
        const visited = new Set<string>()

        while (true) {
          const key = `${currentPortId}:${currentSlot}`
          if (visited.has(key)) break
          visited.add(key)

          const link = findLink(currentPortId, currentSlot, getAllLinks())
          if (!link) break

          const otherSide = getOtherSide(link, currentPortId, currentSlot)
          let otherEntry = resolvePort(otherSide.portId, portLookups)
          if (!otherEntry) break

          // Lazy-load the remote rack if needed
          await ensureRack(otherEntry.device.rack.id)
          // Re-resolve after possible cache update
          otherEntry = resolvePort(otherSide.portId, portLookups)
          if (!otherEntry) break

          const fromEntry = resolvePort(currentPortId, portLookups)
          if (!fromEntry) break

          hops.push({
            link,
            from: { ...fromEntry, slot: currentSlot },
            to: { ...otherEntry, slot: otherSide.slot },
          })

          // Passthrough patch panels; stop at any other device
          if (otherEntry.device.category === 'patch_panel') {
            currentPortId = otherSide.portId
            currentSlot = passthroughSlot(otherSide.slot)
          } else {
            break
          }
        }
        return hops
      }

      // Walk in the clicked direction (forward)
      const forwardHops = await walkDirection(originPortId, originSlot)

      // Walk in the opposite direction (backward), then reverse+flip to get
      // the chain leading *to* the clicked port
      const backwardRaw = await walkDirection(originPortId, passthroughSlot(originSlot))
      const backwardHops: TraceHop[] = backwardRaw
        .map(h => ({ link: h.link, from: h.to, to: h.from }))
        .reverse()

      // Full ordered chain: origin-side → ... → clicked port → ... → terminus-side
      const allHops = [...backwardHops, ...forwardHops]

      // True origin/terminus are the outer endpoints of the combined chain
      const origin: HopEndpoint = allHops.length > 0
        ? allHops[0].from
        : { ...originEntry, slot: originSlot }
      const terminus: HopEndpoint = allHops.length > 0
        ? allHops[allHops.length - 1].to
        : { ...originEntry, slot: originSlot }

      setTrace({ hops: allHops, origin, terminus })
    } catch (err: any) {
      setError(err.message ?? 'Trace failed')
    } finally {
      setLoading(false)
    }
  }, [originPortId, originSlot, currentPayload, rackCache])

  useEffect(() => { runTrace() }, [runTrace])

  function handleHopClick(hop: TraceHop, index: number) {
    setSelectedHopIndex(index)
    setPinnedLinkId(hop.link.id)
    setHighlightedLinkId(hop.link.id)
    const fromRackId = hop.from.device.rack.id
    const toRackId = hop.to.device.rack.id
    const curRackId = currentPayload.rack.id
    if (fromRackId !== curRackId && toRackId !== curRackId) {
      onNavigateToRack?.(fromRackId, hop.link.id)
    } else if (fromRackId !== toRackId) {
      const remoteId = fromRackId === curRackId ? toRackId : fromRackId
      const remotePayload = rackCache.get(remoteId)
      if (remotePayload?.site.id !== currentPayload.site.id) {
        onOpenSplitView?.(remoteId, hop.link.id)
      } else {
        onNavigateToRack?.(remoteId, hop.link.id)
      }
    }
  }

  const border = '1px solid #334155'
  const s: Record<string, CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
    header: { padding: '10px 12px', borderBottom: border, background: '#0F172A', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontSize: 13, fontWeight: 700, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 6 },
    refreshBtn: { background: 'none', border, borderRadius: 4, color: '#64748B', fontSize: 11, padding: '2px 8px', cursor: 'pointer' },
    body: { flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 0 },
    emptyState: { padding: 32, textAlign: 'center', color: '#64748B', fontSize: 12 },
    hopRow: { display: 'flex', flexDirection: 'row', gap: 0 },
    barCol: { width: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, marginRight: 8 },
    card: { flex: 1, background: '#1E293B', border, borderRadius: 6, padding: '8px 10px', marginBottom: 6, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', display: 'flex', flexDirection: 'column', gap: 3 },
    cardSelected: { borderColor: '#3BB2F6', background: '#0EA5E911' },
    sectionLabel: { fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, color: '#475569', marginBottom: 2 },
    deviceName: { fontWeight: 700, fontSize: 12, color: '#F1F5F9' },
    portRow: { fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 },
    portBadge: { background: '#0F172A', border, borderRadius: 3, padding: '1px 4px', fontSize: 9, fontWeight: 700, color: '#3BB2F6' },
    slotBadge: { fontSize: 9, padding: '1px 3px', borderRadius: 2, background: '#334155', color: '#94A3B8' },
    cableRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0 3px 16px' },
    cableLine: { flex: 1, height: 2, borderRadius: 1 },
    cableLabel: { fontSize: 10, color: '#64748B', fontStyle: 'italic', whiteSpace: 'nowrap' as const },
    navBtn: { background: 'none', border, borderRadius: 4, color: '#3BB2F6', fontSize: 10, padding: '2px 6px', cursor: 'pointer', marginTop: 4, alignSelf: 'flex-start' as const },
  }

  function renderEndpointCard(ep: HopEndpoint, role: 'origin' | 'terminus', color: string) {
    const isCurrentRack = ep.device.rack.id === currentPayload.rack.id
    return (
      <div style={s.hopRow}>
        <div style={s.barCol}>
          <div style={{ width: 6, flex: role === 'origin' ? undefined : 1, height: role === 'origin' ? '50%' : undefined, background: 'transparent' }} />
          <div style={{ width: 6, flex: role === 'origin' ? 1 : undefined, height: role === 'terminus' ? '50%' : undefined, background: color, borderRadius: role === 'origin' ? '3px 3px 0 0' : '0 0 3px 3px' }} />
        </div>
        <div style={{ ...s.card, borderLeft: `3px solid ${color}`, cursor: 'default' }}>
          <div style={s.sectionLabel}>{role === 'origin' ? '⬤ Origin' : '⬤ Terminus'}</div>
          <div style={s.deviceName}>
            {!isCurrentRack && <span style={{ fontSize: 10, color: '#64748B', marginRight: 4 }}>{ep.device.site?.name} / {ep.device.rack?.name} / </span>}
            {ep.device.name}
          </div>
          <div style={s.portRow}>
            <span style={s.portBadge}>Port {ep.port.label}</span>
            <span style={s.slotBadge}>{ep.slot === 'front' ? 'F' : 'B'}</span>
            <span style={{ color: '#475569' }}>{ep.port.connectorType}</span>
          </div>
        </div>
      </div>
    )
  }

  function renderHopCard(hop: TraceHop, index: number) {
    const isSelected = selectedHopIndex === index
    const color = hop.link.color ?? '#64748B'
    const isCrossRack = hop.from.device.rack?.id !== hop.to.device.rack?.id
    const isCrossSite = (hop.from.device.site?.id ?? hop.from.device.rack?.id) !== (hop.to.device.site?.id ?? hop.to.device.rack?.id)

    return (
      <div key={hop.link.id}>
        <div style={s.cableRow}>
          <div style={{ ...s.cableLine, background: color }} />
          <span style={{ ...s.cableLabel, color }}>{hop.link.cableType}{hop.link.label ? ` · ${hop.link.label}` : ''}</span>
          <div style={{ ...s.cableLine, background: color }} />
        </div>
        <div style={s.hopRow} onClick={() => handleHopClick(hop, index)}>
          <div style={s.barCol}>
            <div style={{ width: 6, flex: 1, background: color }} />
          </div>
          <div style={{ ...s.card, borderLeft: `3px solid ${color}`, ...(isSelected ? s.cardSelected : {}) }}>
            {(isCrossRack || isCrossSite) && (
              <div style={{ ...s.sectionLabel, color: isCrossSite ? '#A78BFA' : '#3BB2F6' }}>
                {isCrossSite ? '🌐 Cross-site' : '🔀 Cross-rack'}
              </div>
            )}
            <div style={s.deviceName}>
              {isCrossRack && <span style={{ fontSize: 10, color: '#64748B', marginRight: 4 }}>{hop.to.device.rack.name} / </span>}
              {hop.to.device.name}
            </div>
            <div style={s.portRow}>
              <span style={s.portBadge}>Port {hop.to.port.label}</span>
              <span style={s.slotBadge}>{hop.to.slot === 'front' ? 'F' : 'B'}</span>
            </div>
            {isCrossRack && (
              <button style={s.navBtn} onClick={e => { e.stopPropagation(); isCrossSite ? onOpenSplitView?.(hop.to.device.rack.id, hop.link.id) : onNavigateToRack?.(hop.to.device.rack.id, hop.link.id) }}>
                {isCrossSite ? '⇄ Split view' : '→ Open rack'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={s.container}>
      <div style={s.header}><span style={s.headerTitle}>↯ Trace</span></div>
      <div style={s.emptyState}>⏳<br />Tracing path…</div>
    </div>
  )

  if (error) return (
    <div style={s.container}>
      <div style={s.header}><span style={s.headerTitle}>↯ Trace</span><button style={s.refreshBtn} onClick={runTrace}>Retry</button></div>
      <div style={{ ...s.emptyState, color: '#F87171' }}>⚠️<br />{error}</div>
    </div>
  )

  if (!trace) return null

  const { hops, origin, terminus } = trace
  const originColor = hops[0]?.link.color ?? '#10B981'
  const terminusColor = hops[hops.length - 1]?.link.color ?? originColor

  return (
    <div style={s.container}>
      <div style={s.header}>
        <span style={s.headerTitle}>
          ↯ Trace
          <span style={{ fontSize: 10, color: '#64748B', fontWeight: 400 }}>{hops.length} hop{hops.length !== 1 ? 's' : ''}</span>
        </span>
        <button style={s.refreshBtn} onClick={runTrace}>↺ Re-trace</button>
      </div>
      <div style={s.body}>
        {hops.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔌</div>
            <div>Port is not connected.</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>No cable link found on this port and slot.</div>
          </div>
        ) : (
          <>
            {renderEndpointCard(origin, 'origin', originColor)}
            {hops.map((hop, i) => renderHopCard(hop, i))}
            <div style={s.cableRow}>
              <div style={{ ...s.cableLine, background: terminusColor }} />
              <span style={{ ...s.cableLabel, color: terminusColor }}>{hops[hops.length - 1].link.cableType}</span>
              <div style={{ ...s.cableLine, background: terminusColor }} />
            </div>
            {renderEndpointCard(terminus, 'terminus', terminusColor)}
          </>
        )}
      </div>
    </div>
  )
}
