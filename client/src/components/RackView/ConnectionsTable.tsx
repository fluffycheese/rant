import { useState, useMemo, useRef, useEffect, type CSSProperties } from 'react'
import type { CableLink, RackDevice, Rack } from '../../api/client.ts'
import { usePatching } from '../../contexts/PatchingContext.tsx'

type Props = {
  currentRack: Rack
  links: CableLink[]
  devices: RackDevice[]
  compact?: boolean
  onDeleteLink: (linkId: string) => void
  onAddLink?: () => void
  onEditLink?: (link: CableLink) => void
}

export default function ConnectionsTable({
  currentRack,
  links,
  devices,
  compact = false,
  onDeleteLink,
  onAddLink,
  onEditLink,
}: Props) {
  const [filter, setFilter] = useState('')
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null)
  const { highlightedLinkId, setHighlightedLinkId, pinnedLinkId, setPinnedLinkId } = usePatching()
  const tableRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to highlighted link
  useEffect(() => {
    if (highlightedLinkId && tableRef.current) {
      const row = tableRef.current.querySelector(`[data-link-id="${highlightedLinkId}"]`)
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [highlightedLinkId])

  // Build quick lookup for portId -> { device, port }
  const portLookup = useMemo(() => {
    const map = new Map<string, { device: RackDevice; portLabel: string; portType: string }>()
    for (const dev of devices) {
      for (const p of dev.ports) {
        map.set(p.id, {
          device: dev,
          portLabel: p.label,
          portType: p.connectorType,
        })
      }
    }
    return map
  }, [devices])

  // Filter links
  const filteredLinks = useMemo(() => {
    if (!filter.trim()) return links
    const q = filter.toLowerCase()

    return links.filter(l => {
      const a = portLookup.get(l.portAId)
      const b = portLookup.get(l.portBId)

      return (
        (l.label && l.label.toLowerCase().includes(q)) ||
        l.cableType.toLowerCase().includes(q) ||
        (a && (a.device.name.toLowerCase().includes(q) || a.portLabel.toLowerCase().includes(q))) ||
        (b && (b.device.name.toLowerCase().includes(q) || b.portLabel.toLowerCase().includes(q)))
      )
    })
  }, [links, filter, portLookup])

  const border = '1px solid #334155'

  const s: Record<string, CSSProperties> = {
    container: {
      background: '#1E293B',
      border,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    header: {
      padding: '10px 12px',
      borderBottom: border,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      background: '#0F172A',
      flexShrink: 0,
    },
    titleGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    title: {
      fontSize: 13,
      fontWeight: 700,
      color: '#F1F5F9',
    },
    countBadge: {
      fontSize: 10,
      padding: '1px 5px',
      borderRadius: 8,
      background: '#1E293B',
      color: '#64748B',
      border,
    },
    searchInput: {
      background: '#1E293B',
      border,
      borderRadius: 6,
      padding: '3px 8px',
      fontSize: 11,
      color: '#F1F5F9',
      outline: 'none',
      width: compact ? 110 : 160,
      minWidth: 0,
    },
    tableWrapper: {
      overflowX: compact ? 'hidden' : 'auto',
      overflowY: 'auto',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 12,
      textAlign: 'left',
      tableLayout: compact ? 'fixed' : 'auto',
    },
    th: {
      padding: compact ? '8px 10px' : '10px 14px',
      color: '#64748B',
      fontWeight: 600,
      fontSize: 10,
      borderBottom: border,
      background: '#1E293B',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      whiteSpace: 'nowrap' as const,
    },
    td: {
      padding: compact ? '8px 10px' : '10px 14px',
      borderBottom: '1px solid #1E293B',
      color: '#CBD5E1',
      verticalAlign: 'middle',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: compact ? 'nowrap' as const : 'normal',
    },
    endpoint: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      minWidth: 0,
    },
    deviceName: {
      fontWeight: 600,
      color: '#F1F5F9',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      minWidth: 0,
    },
    portBadge: {
      background: '#0F172A',
      border,
      borderRadius: 3,
      padding: '1px 4px',
      fontSize: 9,
      fontWeight: 700,
      color: '#3BB2F6',
      flexShrink: 0,
    },
    slotBadge: {
      fontSize: 9,
      padding: '1px 3px',
      borderRadius: 2,
      background: '#334155',
      color: '#94A3B8',
      flexShrink: 0,
    },
    cableBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 10,
      padding: '2px 6px',
      borderRadius: 3,
      background: '#0F172A',
      border,
      textTransform: 'uppercase' as const,
      fontWeight: 600,
    },
    colorDot: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      display: 'inline-block',
      flexShrink: 0,
    },
    actionBtn: {
      background: 'none',
      border: 'none',
      color: '#64748B',
      cursor: 'pointer',
      fontSize: 12,
      padding: '1px 4px',
      borderRadius: 3,
    },
    emptyRow: {
      padding: 24,
      textAlign: 'center',
      color: '#64748B',
      fontSize: 12,
    },
  }

  const colCount = compact ? 2 : 5

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.titleGroup}>
          <span style={s.title}>Connections</span>
          <span style={s.countBadge}>{links.length}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {links.length > 0 && (
            <input
              type="text"
              placeholder="Filter…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={s.searchInput}
            />
          )}
          {onAddLink && (
            <button type="button" onClick={onAddLink} style={{
              background: '#10B981', color: '#fff', border: 'none',
              borderRadius: 5, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={s.tableWrapper} ref={tableRef}>
        <table style={s.table}>
          <colgroup>
            {compact ? (
              <>
                <col style={{ width: '50%' }} />
                <col style={{ width: '50%' }} />
              </>
            ) : null}
          </colgroup>
          <thead>
            <tr>
              <th style={s.th}>Endpoint A</th>
              <th style={s.th}>Endpoint B</th>
              {!compact && <th style={s.th}>Cable</th>}
              {!compact && <th style={s.th}>Label</th>}
              {!compact && <th style={{ ...s.th, width: 60, textAlign: 'center' }}></th>}
            </tr>
          </thead>
          <tbody>
            {filteredLinks.length === 0 ? (
              <tr>
                <td colSpan={colCount} style={s.emptyRow}>
                  {links.length === 0 ? (
                    <div>
                      <div>No connections yet.</div>
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
                        Click any empty port on a device to start patching.
                      </div>
                    </div>
                  ) : (
                    <div>No connections match "{filter}".</div>
                  )}
                </td>
              </tr>
            ) : (
              filteredLinks.map((link) => {
                const a = portLookup.get(link.portAId)
                const b = portLookup.get(link.portBId)
                const isHovered = hoveredLinkId === link.id
                const isHighlighted = highlightedLinkId === link.id

                const endpointLabel = (info: typeof a, slot: string) => info ? (
                  <div style={s.endpoint}>
                    <span style={s.deviceName} title={info.device.rack.id !== currentRack.id
                      ? `${info.device.site.name} / ${info.device.rack.name} / ${info.device.name}`
                      : info.device.name}>
                      {info.device.rack.id !== currentRack.id
                        ? `${info.device.rack.name} / ${info.device.name}`
                        : info.device.name}
                    </span>
                    <span style={s.portBadge}>{info.portLabel}</span>
                    <span style={s.slotBadge}>{slot === 'front' ? 'F' : 'B'}</span>
                  </div>
                ) : <span style={{ color: '#475569' }}>Unknown</span>

                return (
                  <tr
                    key={link.id}
                    data-link-id={link.id}
                    onClick={() => setPinnedLinkId(pinnedLinkId === link.id ? null : link.id)}
                    onMouseEnter={() => { setHighlightedLinkId(link.id); setHoveredLinkId(link.id) }}
                    onMouseLeave={() => { setHighlightedLinkId(null); setHoveredLinkId(null) }}
                    style={{
                      backgroundColor: isHighlighted ? '#0EA5E922' : 'transparent',
                      transition: 'background-color 0.15s',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Endpoint A — with colour strip on left */}
                    <td style={{ ...s.td, borderLeft: `3px solid ${link.color || '#4a9eff'}` }}>
                      {endpointLabel(a, link.portASlot)}
                    </td>

                    {/* Endpoint B — in compact mode, action icons appear here on hover */}
                    <td style={s.td}>
                      {compact ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, minWidth: 0 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            {endpointLabel(b, link.portBSlot)}
                          </div>
                          {isHovered && (
                            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                              {onEditLink && (
                                <button type="button" style={s.actionBtn}
                                  onClick={(e) => { e.stopPropagation(); onEditLink(link) }} title="Edit">🔗</button>
                              )}
                              <button type="button" style={{ ...s.actionBtn, color: '#F87171' }}
                                onClick={(e) => { e.stopPropagation(); if (confirm('Delete this cable link?')) onDeleteLink(link.id) }}
                                title="Delete">🗑</button>
                            </div>
                          )}
                        </div>
                      ) : (
                        endpointLabel(b, link.portBSlot)
                      )}
                    </td>

                    {!compact && (
                      <td style={s.td}>
                        <span style={s.cableBadge}>
                          <span style={{ ...s.colorDot, background: link.color || '#4a9eff' }} />
                          {link.cableType}
                        </span>
                      </td>
                    )}

                    {!compact && (
                      <td style={s.td}>
                        <span style={{ color: link.label ? '#F1F5F9' : '#475569', fontSize: 11 }}>
                          {link.label || '—'}
                        </span>
                      </td>
                    )}

                    {!compact && (
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        {onEditLink && (
                          <button type="button" style={s.actionBtn}
                            onClick={(e) => { e.stopPropagation(); onEditLink(link) }} title="Edit connection">🔗</button>
                        )}
                        <button type="button" style={s.actionBtn}
                          onClick={(e) => { e.stopPropagation(); if (confirm('Delete this cable link?')) onDeleteLink(link.id) }}
                          title="Delete connection">🗑</button>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

