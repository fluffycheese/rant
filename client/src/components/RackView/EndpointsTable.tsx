import { useState, useMemo, useRef, useEffect, type CSSProperties } from 'react'
import type { RackDevice, CableLink, Rack } from '../../api/client.ts'
import { usePatching } from '../../contexts/PatchingContext.tsx'

import type { SelectedPortInfo } from './DeviceCard.tsx'

type Props = {
  currentRack: Rack
  links: CableLink[]
  devices: RackDevice[]
  compact?: boolean
  onEditDevice?: (deviceId: string) => void
  onDeleteDevice?: (deviceId: string) => void
  onDeleteLink?: (linkId: string) => void
  onSelectPort?: (info: SelectedPortInfo) => void
  onEditLink?: (link: CableLink) => void
  onTrace?: (portId: string, slot: 'front' | 'back') => void
}

const CATEGORY_ICONS: Record<string, string> = {
  wall_panel: '🧱',
  wifi_ap: '📶',
  ip_camera: '📹',
  other: '📦',
}

const ENDPOINT_CATEGORIES = ['wall_panel', 'wifi_ap', 'ip_camera']

export default function EndpointsTable({
  currentRack,
  links,
  devices,
  compact = false,
  onEditDevice,
  onDeleteDevice,
  onDeleteLink,
  onSelectPort,
  onEditLink,
  onTrace,
}: Props) {
  const [filter, setFilter] = useState('')
  const [hoveredEndpointId, setHoveredEndpointId] = useState<string | null>(null)
  const { selectedPort, highlightedLinkId, setHighlightedLinkId, pinnedLinkId, setPinnedLinkId } = usePatching()
  const tableRef = useRef<HTMLDivElement>(null)

  // Filter out only the endpoint devices in this rack
  const endpoints = useMemo(() => {
    return devices.filter(d => d.rackId === currentRack.id && ENDPOINT_CATEGORIES.includes(d.category))
  }, [devices, currentRack.id])

  // Flatten endpoints into one row per port
  const rows = useMemo(() => {
    const arr: {
      id: string
      device: RackDevice
      portLabel: string
      portType: string
      portId: string
      port: any // passing raw port for onSelectPort
      link: CableLink | undefined
    }[] = []

    for (const dev of endpoints) {
      for (const p of dev.ports) {
        // Find the front or back link for this port
        const link = links.find(l => l.portAId === p.id || l.portBId === p.id)
        
        arr.push({
          id: `${dev.id}-${p.id}`,
          device: dev,
          portLabel: p.label,
          portType: p.connectorType,
          portId: p.id,
          port: p,
          link,
        })
      }
    }
    return arr
  }, [endpoints, links])

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!filter.trim()) return rows
    const q = filter.toLowerCase()

    return rows.filter(r => {
      return (
        r.device.name.toLowerCase().includes(q) ||
        r.portLabel.toLowerCase().includes(q) ||
        (r.link && r.link.label && r.link.label.toLowerCase().includes(q))
      )
    })
  }, [rows, filter])

  // Auto-scroll to highlighted link if it matches any of our rows
  useEffect(() => {
    if (highlightedLinkId && tableRef.current) {
      const row = tableRef.current.querySelector(`[data-link-id="${highlightedLinkId}"]`)
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [highlightedLinkId])

  // Build quick lookup for portId -> { device, port } for connected targets
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
    actions: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
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
    deleteBtn: {
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

  const colCount = compact ? 2 : 4

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.titleGroup}>
          <span style={s.title}>Endpoints</span>
          <span style={s.countBadge}>{endpoints.length} devices</span>
        </div>

        <div style={s.actions}>
          {rows.length > 0 && (
            <input
              type="text"
              placeholder="Filter endpoints…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={s.searchInput}
            />
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
              <th style={s.th}>Endpoint</th>
              <th style={s.th}>Connected To</th>
              {!compact && <th style={s.th}>Cable</th>}
              {!compact && <th style={{ ...s.th, width: 80, textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} style={s.emptyRow}>
                  {rows.length === 0 ? (
                    <div>
                      <div>No endpoint devices (WiFi APs, IP Cameras, Wall Panels) installed.</div>
                    </div>
                  ) : (
                    <div>No endpoints match "{filter}".</div>
                  )}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const linkId = row.link?.id
                let targetData = null
                
                if (row.link) {
                  const targetPortId = row.link.portAId === row.portId ? row.link.portBId : row.link.portAId
                  targetData = portLookup.get(targetPortId)
                }

                const slot: 'front' | 'back' = row.link
                  ? (row.link.portAId === row.portId ? row.link.portASlot : row.link.portBSlot)
                  : 'front'
                const targetSlot: 'front' | 'back' = row.link
                  ? (row.link.portAId === row.portId ? row.link.portBSlot : row.link.portASlot)
                  : 'front'

                const isHovered = hoveredEndpointId === row.id
                const isSelected = selectedPort?.port.id === row.portId
                const isHighlighted = Boolean((linkId && highlightedLinkId === linkId) || isSelected)

                const renderActions = (isCompactAction = false) => (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0, justifyContent: isCompactAction ? 'flex-end' : 'center' }}>
                    {row.link && onTrace && (
                      <button
                        type="button"
                        style={{ ...s.actionBtn, color: '#0EA5E9' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onTrace(row.portId, slot)
                        }}
                        title={isCompactAction ? 'Trace' : 'Trace connection'}
                      >
                        ↯
                      </button>
                    )}
                    {(onEditLink || onSelectPort) && (
                      <button
                        type="button"
                        style={s.actionBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (row.link && onEditLink) {
                            onEditLink(row.link)
                          } else if (!row.link && onSelectPort) {
                            onSelectPort({ port: row.port, slot: 'front', device: row.device })
                          }
                        }}
                        title={row.link ? (isCompactAction ? 'Edit' : 'Edit connection') : (isCompactAction ? 'Patch' : 'Patch connection')}
                      >
                        🔗
                      </button>
                    )}
                    {isCompactAction && (onDeleteDevice || (row.link && onDeleteLink)) && (
                      <button
                        type="button"
                        style={{ ...s.actionBtn, color: '#F87171' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onDeleteDevice) {
                            if (confirm(`Remove "${row.device.name}"?`)) {
                              onDeleteDevice(row.device.id)
                            }
                          } else if (row.link && onDeleteLink) {
                            if (confirm('Delete this cable link?')) {
                              onDeleteLink(row.link.id)
                            }
                          }
                        }}
                        title="Delete"
                      >
                        🗑
                      </button>
                    )}
                    {!isCompactAction && row.device.ports[0]?.id === row.portId && (
                      <>
                        {onEditDevice && (
                          <button
                            type="button"
                            style={s.actionBtn}
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditDevice(row.device.id)
                            }}
                            title="Edit device"
                          >
                            ✎
                          </button>
                        )}
                        {(onDeleteDevice || (row.link && onDeleteLink)) && (
                          <button
                            type="button"
                            style={{ ...s.actionBtn, color: '#F87171' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (onDeleteDevice) {
                                if (confirm(`Remove "${row.device.name}"?`)) {
                                  onDeleteDevice(row.device.id)
                                }
                              } else if (row.link && onDeleteLink) {
                                if (confirm('Delete this cable link?')) {
                                  onDeleteLink(row.link.id)
                                }
                              }
                            }}
                            title="Delete device"
                          >
                            🗑
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )

                return (
                  <tr
                    key={row.id}
                    data-link-id={linkId}
                    onClick={() => {
                      if (linkId) {
                        setPinnedLinkId(pinnedLinkId === linkId ? null : linkId)
                      } else if (onSelectPort) {
                        onSelectPort({ port: row.port, slot: 'front', device: row.device })
                      }
                    }}
                    onMouseEnter={() => {
                      if (linkId) setHighlightedLinkId(linkId)
                      setHoveredEndpointId(row.id)
                    }}
                    onMouseLeave={() => {
                      if (linkId) setHighlightedLinkId(null)
                      setHoveredEndpointId(null)
                    }}
                    style={{
                      backgroundColor: isHighlighted ? '#0EA5E922' : 'transparent',
                      transition: 'background-color 0.15s',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Endpoint */}
                    <td style={{ ...s.td, borderLeft: row.link ? `3px solid ${row.link.color || '#4a9eff'}` : '3px solid transparent' }}>
                      <div style={s.endpoint}>
                        <span style={{ fontSize: 14 }}>{CATEGORY_ICONS[row.device.category] || CATEGORY_ICONS.other}</span>
                        <span style={s.deviceName} title={row.device.name}>{row.device.name}</span>
                        <span style={s.portBadge}>Port {row.portLabel}</span>
                      </div>
                    </td>

                    {/* Connected To */}
                    <td style={s.td}>
                      {compact ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, minWidth: 0 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            {targetData ? (
                              <div style={s.endpoint}>
                                <span
                                  style={s.deviceName}
                                  title={targetData.device.rack.id !== currentRack.id
                                    ? `${targetData.device.site?.name ?? ''} / ${targetData.device.rack?.name ?? ''} / ${targetData.device.name}`
                                    : targetData.device.name}
                                >
                                  {targetData.device.rack.id !== currentRack.id
                                    ? `${targetData.device.rack?.name ?? ''} / ${targetData.device.name}`
                                    : targetData.device.name}
                                </span>
                                <span style={s.portBadge}>Port {targetData.portLabel}</span>
                                <span style={s.slotBadge}>{targetSlot === 'front' ? 'F' : 'B'}</span>
                              </div>
                            ) : (
                              <span style={{ color: '#475569', fontStyle: 'italic' }}>Unconnected</span>
                            )}
                          </div>
                          {isHovered && renderActions(true)}
                        </div>
                      ) : targetData ? (
                        <div style={s.endpoint}>
                          <span
                            style={s.deviceName}
                            title={targetData.device.rack.id !== currentRack.id
                              ? `${targetData.device.site?.name ?? ''} / ${targetData.device.rack?.name ?? ''} / ${targetData.device.name}`
                              : targetData.device.name}
                          >
                            {targetData.device.rack.id !== currentRack.id
                              ? `${targetData.device.rack?.name ?? ''} / ${targetData.device.name}`
                              : targetData.device.name}
                          </span>
                          <span style={s.portBadge}>Port {targetData.portLabel}</span>
                          <span style={s.slotBadge}>{targetSlot === 'front' ? 'F' : 'B'}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#475569', fontStyle: 'italic' }}>Unconnected</span>
                      )}
                    </td>

                    {/* Cable */}
                    {!compact && (
                      <td style={s.td}>
                        {row.link ? (
                          <span style={s.cableBadge}>
                            <span
                              style={{
                                ...s.colorDot,
                                background: row.link.color || '#4a9eff',
                              }}
                            />
                            {row.link.cableType}
                          </span>
                        ) : (
                          <span style={{ color: '#6e7681' }}>—</span>
                        )}
                      </td>
                    )}

                    {/* Actions */}
                    {!compact && (
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        {renderActions(false)}
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
