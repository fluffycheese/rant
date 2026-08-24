import { useEffect, useState, useMemo, useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import mermaid from 'mermaid'
import { usePatching } from '../contexts/PatchingContext.tsx'

export type LinkData = {
  id: string
  color: string | null
  cableType: string
  notes: string | null
  label: string | null
  rackAId?: string
  rackBId?: string
  siteAId?: string
  siteBId?: string
  endpointA: {
    siteName: string
    rackName: string
    deviceName: string
    portLabel: string
    slot: 'front' | 'back'
  }
  endpointB: {
    siteName: string
    rackName: string
    deviceName: string
    portLabel: string
    slot: 'front' | 'back'
  }
}

type Props = {
  title: string
  mermaidData: string | null
  links: LinkData[]
}

export default function TopologyView({ title, mermaidData, links }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { setCrossSiteTargetRackId } = usePatching()
  const [filter, setFilter] = useState('')
  const [filterNodeId, setFilterNodeId] = useState<string | null>(null)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    })
  }, [])

  useEffect(() => {
    let active = true
    if (mermaidData && containerRef.current) {
      const graphId = 'mermaid-graph-' + Math.random().toString(36).substr(2, 9)
      mermaid.render(graphId, mermaidData).then((result) => {
        if (active && containerRef.current) {
          containerRef.current.innerHTML = result.svg
        }
      }).catch(err => {
        console.error('Mermaid render error:', err)
        if (active && containerRef.current) {
          containerRef.current.innerHTML = `<div style="color: #ff7b72;">Error rendering topology diagram.</div>`
        }
      })
    }
    return () => { active = false }
  }, [mermaidData])

  const handleMermaidClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const node = target.closest('.node')
    if (node) {
      const match = node.id.match(/(rack|site)_([a-f0-9_]+)/i)
      if (match) {
        const type = match[1]
        // Restore hyphens from underscores
        const rawUuid = match[2].replace(/_/g, '-')
        // Extract exact UUID
        const uuidMatch = rawUuid.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)
        
        if (uuidMatch) {
          const filterId = `${type}_${uuidMatch[0]}`
          setFilterNodeId(prev => prev === filterId ? null : filterId)
        }
      }
    } else {
      setFilterNodeId(null)
    }
  }

  const handleRowClick = (link: LinkData) => {
    if (link.rackBId && link.rackAId) {
      setCrossSiteTargetRackId(link.rackBId)
      navigate('/racks/' + link.rackAId)
    }
  }

  const filteredLinks = useMemo(() => {
    let result = links
    if (filterNodeId) {
      const isRack = filterNodeId.startsWith('rack_')
      const id = filterNodeId.substring(5) // 'rack_' and 'site_' are both 5 chars long
      
      result = result.filter(l => {
        if (isRack) {
          return l.rackAId === id || l.rackBId === id
        } else {
          return l.siteAId === id || l.siteBId === id
        }
      })
    }

    if (filter.trim()) {
      const q = filter.toLowerCase()
      result = result.filter(l => {
        const searchStr = `
          ${l.label || ''} ${l.cableType} 
          ${l.endpointA.siteName} ${l.endpointA.rackName} ${l.endpointA.deviceName} ${l.endpointA.portLabel}
          ${l.endpointB.siteName} ${l.endpointB.rackName} ${l.endpointB.deviceName} ${l.endpointB.portLabel}
        `.toLowerCase()
        return searchStr.includes(q)
      })
    }
    return result
  }, [links, filter, filterNodeId])

  const s: Record<string, CSSProperties> = {
    container: {
      padding: '24px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      background: '#0d1117',
      color: '#c9d1d9',
      overflow: 'hidden'
    },
    header: {
      fontSize: 20,
      fontWeight: 600,
      color: '#e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    countBadge: {
      fontSize: 12,
      padding: '2px 8px',
      borderRadius: 12,
      background: '#21262d',
      color: '#8b949e',
      border: '1px solid #30363d',
      marginLeft: 12,
    },
    mermaidWrapper: {
      flex: 1,
      minHeight: 200,
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: 8,
      padding: '24px',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    hint: {
      fontSize: 13,
      color: '#8b949e',
      marginBottom: 12,
      alignSelf: 'flex-start',
    },
    mermaidContainer: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
    },
    tableContainer: {
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flex: 1,
      minHeight: 300,
    },
    tableHeader: {
      padding: '12px 16px',
      borderBottom: '1px solid #30363d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#0d1117',
    },
    searchInput: {
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: 6,
      padding: '6px 12px',
      fontSize: 13,
      color: '#e2e8f0',
      outline: 'none',
      width: 240,
    },
    tableWrapper: {
      overflowX: 'auto',
      overflowY: 'auto',
      flex: 1,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 13,
      textAlign: 'left',
    },
    th: {
      padding: '12px 16px',
      color: '#8b949e',
      fontWeight: 600,
      fontSize: 12,
      borderBottom: '1px solid #30363d',
      background: '#161b22',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      position: 'sticky',
      top: 0,
      zIndex: 1,
    },
    tr: {
      cursor: 'pointer',
    },
    td: {
      padding: '12px 16px',
      borderBottom: '1px solid #21262d',
      color: '#c9d1d9',
      verticalAlign: 'middle',
    },
    endpoint: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap'
    },
    pathBadge: {
      color: '#8b949e',
      fontSize: 12,
    },
    deviceName: {
      fontWeight: 600,
      color: '#e2e8f0',
    },
    portBadge: {
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: 4,
      padding: '2px 6px',
      fontSize: 11,
      fontWeight: 700,
      color: '#58a6ff',
    },
    slotBadge: {
      fontSize: 10,
      padding: '2px 5px',
      borderRadius: 3,
      background: '#21262d',
      color: '#8b949e',
    },
    cableBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      padding: '4px 10px',
      borderRadius: 4,
      background: '#0d1117',
      border: '1px solid #30363d',
      textTransform: 'uppercase',
      fontWeight: 600,
    },
    colorDot: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      display: 'inline-block',
    },
    emptyRow: {
      padding: 48,
      textAlign: 'center',
      color: '#8b949e',
      fontSize: 14,
    },
  }

  return (
    <div style={s.container}>
      <style>{`
        svg .node { cursor: pointer; transition: opacity 0.2s; } 
        svg .node:hover { opacity: 0.8; }
        .row-hover:hover { background: rgba(88, 166, 255, 0.1); }
      `}</style>
      
      <div style={s.header}>
        <div>
          {title}
          <span style={s.countBadge}>{links.length} Links</span>
        </div>
      </div>

      <div style={s.mermaidWrapper} onClick={handleMermaidClick}>
        <div style={s.hint}>💡 Hint: Click any node to filter the connections table below.</div>
        <div style={s.mermaidContainer} ref={containerRef} />
      </div>

      <div style={s.tableContainer}>
        <div style={s.tableHeader}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>Connections {filterNodeId && `(Filtered)`}</div>
          <input
            type="text"
            placeholder="Filter connections…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={s.searchInput}
          />
        </div>

        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Source Endpoint (A)</th>
                <th style={s.th}>Destination Endpoint (B)</th>
                <th style={s.th}>Cable</th>
                <th style={s.th}>Label</th>
              </tr>
            </thead>
            <tbody>
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={4} style={s.emptyRow}>
                    {links.length === 0 ? 'No links found.' : 'No connections match your filter.'}
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => (
                  <tr key={link.id} style={s.tr} className="row-hover" onClick={() => handleRowClick(link)}>
                    <td style={s.td}>
                      <div style={s.endpoint}>
                        <span style={s.pathBadge}>{link.endpointA.siteName} / {link.endpointA.rackName}</span>
                        <span style={s.deviceName}>{link.endpointA.deviceName}</span>
                        <span style={s.portBadge}>Port {link.endpointA.portLabel}</span>
                        <span style={s.slotBadge}>{link.endpointA.slot === 'front' ? 'Front' : 'Back'}</span>
                      </div>
                    </td>

                    <td style={s.td}>
                      <div style={s.endpoint}>
                        <span style={s.pathBadge}>{link.endpointB.siteName} / {link.endpointB.rackName}</span>
                        <span style={s.deviceName}>{link.endpointB.deviceName}</span>
                        <span style={s.portBadge}>Port {link.endpointB.portLabel}</span>
                        <span style={s.slotBadge}>{link.endpointB.slot === 'front' ? 'Front' : 'Back'}</span>
                      </div>
                    </td>

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

                    <td style={s.td}>
                      <span style={{ color: link.label ? '#e2e8f0' : '#6e7681', fontSize: 12 }}>
                        {link.label || '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
