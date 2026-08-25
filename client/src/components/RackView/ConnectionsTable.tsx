import { useState, useMemo, useRef, useEffect, type CSSProperties } from 'react'
import type { CableLink, RackDevice, Rack } from '../../api/client.ts'
import { usePatching } from '../../contexts/PatchingContext.tsx'

type Props = {
  currentRack: Rack
  links: CableLink[]
  devices: RackDevice[]
  onDeleteLink: (linkId: string) => void
  onAddLink?: () => void
  onEditLink?: (link: CableLink) => void
}

export default function ConnectionsTable({
  currentRack,
  links,
  devices,
  onDeleteLink,
  onAddLink,
  onEditLink,
}: Props) {
  const [filter, setFilter] = useState('')
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
    addBtn: {
      background: '#238636',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      padding: '5px 12px',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
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
    slotBadge: {
      fontSize: 9,
      padding: '1px 4px',
      borderRadius: 3,
      background: '#21262d',
      color: '#8b949e',
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
          <span style={s.title}>Connections</span>
          <span style={s.countBadge}>{links.length}</span>
        </div>

        <div style={s.actions}>
          {links.length > 0 && (
            <input
              type="text"
              placeholder="Filter connections…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={s.searchInput}
            />
          )}
          {onAddLink && (
            <button type="button" onClick={onAddLink} style={s.addBtn}>
              + Add Link
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={s.tableWrapper} ref={tableRef}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Endpoint A</th>
              <th style={s.th}>Endpoint B</th>
              <th style={s.th}>Cable Type</th>
              <th style={s.th}>Label</th>
              <th style={{ ...s.th, width: 40, textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredLinks.length === 0 ? (
              <tr>
                <td colSpan={5} style={s.emptyRow}>
                  {links.length === 0 ? (
                    <div>
                      <div>No internal cable connections recorded in this rack yet.</div>
                      <div style={{ fontSize: 11, color: '#6e7681', marginTop: 4 }}>
                        Click ports on the devices above or click "+ Add Link" to patch cables.
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

                return (
                <tr
                  key={link.id}
                  data-link-id={link.id}
                  onClick={() => setPinnedLinkId(pinnedLinkId === link.id ? null : link.id)}
                  onMouseEnter={() => setHighlightedLinkId(link.id)}
                  onMouseLeave={() => setHighlightedLinkId(null)}
                  style={{
                    backgroundColor: highlightedLinkId === link.id ? '#1f6feb33' : 'transparent',
                    transition: 'background-color 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  {/* Endpoint A */}
                  <td style={s.td}>
                    <div style={s.endpoint}>
                        <span style={s.deviceName}>
                          {a ? (a.device.rack.id !== currentRack.id ? `${a.device.site.name} / ${a.device.rack.name} / ${a.device.name}` : a.device.name) : 'Unknown Device'}
                        </span>
                        <span style={s.portBadge}>Port {a ? a.portLabel : '?'}</span>
                        <span style={s.slotBadge}>{link.portASlot === 'front' ? 'Front' : 'Back'}</span>
                      </div>
                    </td>

                    {/* Endpoint B */}
                    <td style={s.td}>
                      <div style={s.endpoint}>
                        <span style={s.deviceName}>
                          {b ? (b.device.rack.id !== currentRack.id ? `${b.device.site.name} / ${b.device.rack.name} / ${b.device.name}` : b.device.name) : 'Unknown Device'}
                        </span>
                        <span style={s.portBadge}>Port {b ? b.portLabel : '?'}</span>
                        <span style={s.slotBadge}>{link.portBSlot === 'front' ? 'Front' : 'Back'}</span>
                      </div>
                    </td>

                    {/* Cable Type + Color */}
                    <td style={s.td}>
                      <span style={s.cableBadge}>
                        <span
                          style={{
                            ...s.colorDot,
                            background: link.color || '#4a9eff',
                          }}
                        />
                        {link.cableType}
                      </span>
                    </td>

                    {/* Label / Notes */}
                    <td style={s.td}>
                      <span style={{ color: link.label ? '#e2e8f0' : '#6e7681', fontSize: 11 }}>
                        {link.label || '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {onEditLink && (
                        <button
                          type="button"
                          style={s.deleteBtn}
                          onClick={() => onEditLink(link)}
                          title="Edit connection"
                        >
                          ✎
                        </button>
                      )}
                      <button
                        type="button"
                        style={s.deleteBtn}
                        onClick={() => {
                          if (confirm('Delete this cable link?')) {
                            onDeleteLink(link.id)
                          }
                        }}
                        title="Delete connection"
                      >
                        🗑
                      </button>
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
