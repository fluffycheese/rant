import { useState, useMemo, useRef, useEffect, type CSSProperties } from 'react'
import type { RackDevice, CableLink, Rack } from '../../api/client.ts'
import { usePatching } from '../../contexts/PatchingContext.tsx'

type Props = {
  currentRack: Rack
  links: CableLink[]
  devices: RackDevice[]
  onEditDevice?: (deviceId: string) => void
  onDeleteDevice?: (deviceId: string) => void
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
  onEditDevice,
  onDeleteDevice,
}: Props) {
  const [filter, setFilter] = useState('')
  const { highlightedLinkId, setHighlightedLinkId, pinnedLinkId, setPinnedLinkId } = usePatching()
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

  const s: Record<string, CSSProperties> = {
    container: {
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    header: {
      padding: '12px 16px',
      borderBottom: '1px solid #30363d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      background: '#0d1117',
    },
    titleGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 14,
      fontWeight: 700,
      color: '#e2e8f0',
    },
    countBadge: {
      fontSize: 11,
      padding: '1px 6px',
      borderRadius: 10,
      background: '#21262d',
      color: '#8b949e',
      border: '1px solid #30363d',
    },
    actions: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    searchInput: {
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: 6,
      padding: '4px 10px',
      fontSize: 12,
      color: '#e2e8f0',
      outline: 'none',
      width: 180,
    },
    tableWrapper: {
      overflowX: 'auto',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 12,
      textAlign: 'left',
    },
    th: {
      padding: '10px 14px',
      color: '#8b949e',
      fontWeight: 600,
      fontSize: 11,
      borderBottom: '1px solid #30363d',
      background: '#161b22',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    td: {
      padding: '10px 14px',
      borderBottom: '1px solid #21262d',
      color: '#c9d1d9',
      verticalAlign: 'middle',
    },
    endpoint: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    deviceName: {
      fontWeight: 600,
      color: '#e2e8f0',
    },
    portBadge: {
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: 4,
      padding: '1px 5px',
      fontSize: 10,
      fontWeight: 700,
      color: '#58a6ff',
    },
    cableBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 4,
      background: '#0d1117',
      border: '1px solid #30363d',
      textTransform: 'uppercase',
      fontWeight: 600,
    },
    colorDot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      display: 'inline-block',
    },
    deleteBtn: {
      background: 'none',
      border: 'none',
      color: '#8b949e',
      cursor: 'pointer',
      fontSize: 13,
      padding: '2px 6px',
      borderRadius: 4,
    },
    emptyRow: {
      padding: 32,
      textAlign: 'center',
      color: '#8b949e',
      fontSize: 13,
    },
  }

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
          <thead>
            <tr>
              <th style={s.th}>Endpoint</th>
              <th style={s.th}>Connected To</th>
              <th style={s.th}>Cable</th>
              <th style={{ ...s.th, width: 60, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} style={s.emptyRow}>
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

                return (
                  <tr
                    key={row.id}
                    data-link-id={linkId}
                    onClick={() => {
                      if (linkId) {
                        setPinnedLinkId(pinnedLinkId === linkId ? null : linkId)
                      }
                    }}
                    onMouseEnter={() => {
                      if (linkId) setHighlightedLinkId(linkId)
                    }}
                    onMouseLeave={() => {
                      if (linkId) setHighlightedLinkId(null)
                    }}
                    style={{
                      backgroundColor: (highlightedLinkId && linkId === highlightedLinkId) ? '#1f6feb33' : 'transparent',
                      transition: 'background-color 0.2s',
                      cursor: linkId ? 'pointer' : 'default',
                    }}
                  >
                    {/* Endpoint */}
                    <td style={s.td}>
                      <div style={s.endpoint}>
                        <span style={{ fontSize: 14 }}>{CATEGORY_ICONS[row.device.category] || CATEGORY_ICONS.other}</span>
                        <span style={s.deviceName}>{row.device.name}</span>
                        <span style={s.portBadge}>Port {row.portLabel}</span>
                      </div>
                    </td>

                    {/* Connected To */}
                    <td style={s.td}>
                      {targetData ? (
                        <div style={s.endpoint}>
                          <span style={s.deviceName}>
                            {targetData.device.rack.id !== currentRack.id ? `${targetData.device.site.name} / ${targetData.device.rack.name} / ${targetData.device.name}` : targetData.device.name}
                          </span>
                          <span style={s.portBadge}>Port {targetData.portLabel}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#6e7681', fontStyle: 'italic' }}>Unconnected</span>
                      )}
                    </td>

                    {/* Cable */}
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

                    {/* Actions */}
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {/* Only render actions on the first port of the device to avoid clutter */}
                      {row.device.ports[0]?.id === row.portId && (
                        <>
                          {onEditDevice && (
                            <button
                              type="button"
                              style={s.deleteBtn}
                              onClick={(e) => { e.stopPropagation(); onEditDevice(row.device.id); }}
                              title="Edit device"
                            >
                              ✎
                            </button>
                          )}
                          {onDeleteDevice && (
                            <button
                              type="button"
                              style={s.deleteBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Remove "${row.device.name}"?`)) {
                                  onDeleteDevice(row.device.id);
                                }
                              }}
                              title="Delete device"
                            >
                              🗑
                            </button>
                          )}
                        </>
                      )}
                    </td>
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
