import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { RackDevice, Port, CableLink } from '../../api/client.ts'
import { usePatching } from '../../contexts/PatchingContext.tsx'

const CATEGORY_ICONS: Record<string, string> = {
  switch:      '🔀',
  patch_panel: '🔌',
  router:      '📡',
  firewall:    '🛡️',
  server:      '🖥',
  wall_panel:  '🧱',
  wifi_ap:     '📶',
  ip_camera:   '📹',
  other:       '📦',
}

export type SelectedPortInfo = {
  port: Port
  slot: 'front' | 'back'
  device: RackDevice
}

type Props = {
  device: RackDevice
  links: CableLink[]
  allDevices?: RackDevice[]
  selectedPort?: SelectedPortInfo | null
  onSelectPort?: (info: SelectedPortInfo) => void
  onDeleteDevice?: (deviceId: string) => void
  onEditDevice?: (deviceId: string) => void
  onUpdateDevicePosition?: (deviceId: string, u: number | null) => Promise<void> | void
  onTrace?: (portId: string, slot: 'front' | 'back') => void
  compact?: boolean
}

export default function DeviceCard({
  device,
  links,
  allDevices = [],
  selectedPort,
  onSelectPort,
  onDeleteDevice,
  onEditDevice,
  onUpdateDevicePosition,
  onTrace,
  compact = false,
}: Props) {
  const [hoveredPortId, setHoveredPortId] = useState<string | null>(null)
  const [hoverBox, setHoverBox] = useState<{ portId: string, rect: DOMRect } | null>(null)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { highlightedLinkId } = usePatching()
  const [localU, setLocalU] = useState<string>(device.positionU?.toString() || '')

  // Debounced hide — gives the user time to move from the port button to the popup
  const scheduleHide = () => {
    hoverTimeout.current = setTimeout(() => setHoverBox(null), 120)
  }
  const cancelHide = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
  }


  // Keep local input in sync with external updates
  useEffect(() => {
    setLocalU(device.positionU?.toString() || '')
  }, [device.positionU])

  const handleUBlur = async () => {
    if (!onUpdateDevicePosition) return
    const parsed = localU === '' ? null : Number(localU)
    if (parsed !== (device.positionU ?? null)) {
      try {
        await onUpdateDevicePosition(device.id, parsed)
      } catch {
        setLocalU(device.positionU?.toString() || '')
      }
    }
  }

  const handleUKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  // Find links attached to a port
  const getPortLinks = (portId: string) => {
    const front = links.find(
      l => (l.portAId === portId && l.portASlot === 'front') ||
           (l.portBId === portId && l.portBSlot === 'front')
    )
    const back = links.find(
      l => (l.portAId === portId && l.portASlot === 'back') ||
           (l.portBId === portId && l.portBSlot === 'back')
    )
    return { front, back }
  }

    // Get description of connected target
    const getTargetDescription = (link: CableLink, currentPortId: string) => {
      const isA = link.portAId === currentPortId
      const targetPortId = isA ? link.portBId : link.portAId
      const targetSlot = isA ? link.portBSlot : link.portASlot

      for (const dev of allDevices) {
        const p = dev.ports.find(port => port.id === targetPortId)
        if (p) {
          if (dev.rack.id !== device.rack.id) {
            return `${dev.site.name} / ${dev.rack.name} / ${dev.name} / Port ${p.label} [${targetSlot}] (${link.cableType})`
          }
          return `${dev.name} / Port ${p.label} [${targetSlot}] (${link.cableType})`
        }
      }
      return `Connected (${link.cableType})`
    }

  const ports = device.ports ?? []
  const portCount = ports.length

  // Group ports contiguously
  const contiguousGroups: { name: string, groupPorts: Port[] }[] = []
  
  for (const p of ports) {
    const name = p.groupName || 'Default'
    const lastGroup = contiguousGroups[contiguousGroups.length - 1]
    
    if (lastGroup && lastGroup.name === name && lastGroup.groupPorts[0]?.groupLayout === p.groupLayout) {
      lastGroup.groupPorts.push(p)
    } else {
      contiguousGroups.push({ name, groupPorts: [p] })
    }
  }

  const portGroups = contiguousGroups.map(({ name, groupPorts }) => {
    const explicitLayout = groupPorts[0]?.groupLayout
    const count = groupPorts.length
    
    // If explicit double_row, or no explicit layout and >4 ports
    const useTwoRows = explicitLayout === 'double_row' || (!explicitLayout && count > 4)
    const numColumns = useTwoRows ? Math.ceil(count / 2) : Math.max(1, count)
    
    let topRowPorts: Port[] = []
    let bottomRowPorts: Port[] = []
    
    if (useTwoRows) {
      topRowPorts = groupPorts.filter((_, idx) => idx % 2 === 0)
      bottomRowPorts = groupPorts.filter((_, idx) => idx % 2 === 1)
    } else {
      topRowPorts = groupPorts
    }
    
    return { name, count, useTwoRows, numColumns, topRowPorts, bottomRowPorts }
  })

  const renderPort = (port: Port) => {
    const { front, back } = getPortLinks(port.id)
    const isFrontSelected = selectedPort?.port.id === port.id && selectedPort.slot === 'front'
    const isBackSelected = selectedPort?.port.id === port.id && selectedPort.slot === 'back'
    const isFrontHighlighted = highlightedLinkId && front?.id === highlightedLinkId
    const isBackHighlighted = highlightedLinkId && back?.id === highlightedLinkId
    const isHovered = hoverBox?.portId === port.id

    const frontColor = front?.color || '#10B981'
    const backColor = back?.color || '#A78BFA'

    // Smart slot: if only back is connected (no front), clicking should select back slot
    const clickSlot = (!front && back) ? 'back' : 'front'

    return (
      <div
        key={port.id}
        onMouseEnter={(e) => { cancelHide(); setHoverBox({ portId: port.id, rect: e.currentTarget.getBoundingClientRect() }) }}
        onMouseLeave={scheduleHide}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <button
          type="button"
          onClick={() => onSelectPort?.({ port, slot: clickSlot, device })}
          style={{
            minWidth: 36,
            height: compact ? 26 : 32,
            padding: '2px 4px',
            background: isFrontSelected
              ? '#0EA5E922'
              : front
              ? (isFrontHighlighted ? '#10B98122' : '#1E293B')
              : '#0F172A',
            border: isFrontSelected
              ? '2px solid #3BB2F6'
              : front
              ? (isFrontHighlighted ? `2px solid #fff` : `1px solid ${frontColor}`)
              : '1px solid #334155',
            borderRadius: 4,
            color: isFrontSelected ? '#3BB2F6' : (front && isFrontHighlighted) ? '#fff' : front ? '#F1F5F9' : '#64748B',
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
            outline: 'none',
            boxShadow: isFrontSelected ? '0 0 8px rgba(59, 178, 246, 0.4)' : (isFrontHighlighted ? `0 0 8px ${frontColor}` : 'none'),
            zIndex: (isFrontHighlighted || isFrontSelected) ? 2 : 1,
          }}
        >
          <div style={{ display: 'flex', width: '100%', height: 3, borderRadius: 1, background: back ? backColor : '#334155' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', fontSize: 8, marginTop: 1 }}>
            <span style={{ color: '#475569' }}>{port.connectorType.slice(0, 3)}</span>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, marginTop: -2, marginBottom: -1 }}>{port.label}</div>

          <div style={{ display: 'flex', width: '100%', height: 3, borderRadius: 1, background: front ? frontColor : '#334155' }} />
        </button>

        {/* Hover detail popup using Portal */}
        {isHovered && hoverBox && createPortal(
          <div
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
            style={{
              position: 'fixed',
              left: hoverBox.rect.left + hoverBox.rect.width / 2,
              top: hoverBox.rect.top - 6,
              transform: 'translate(-50%, -100%)',
              background: '#1E293B',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11,
              color: '#F1F5F9',
              whiteSpace: 'nowrap',
              zIndex: 9999,
              pointerEvents: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <div style={{ fontWeight: 700, color: '#3BB2F6' }}>
              {device.name} · Port {port.label} ({port.connectorType})
            </div>
            <div style={{ fontSize: 10, color: front ? '#34D399' : '#64748B' }}>
              ● Front: {front ? getTargetDescription(front, port.id) : 'Empty'}
            </div>
            <div style={{ fontSize: 10, color: back ? '#C4B5FD' : '#64748B' }}>
              ● Back: {back ? getTargetDescription(back, port.id) : 'Empty'}
            </div>
            {(front || back) && onTrace && (
              <button
                type="button"
                onClick={() => {
                  const slot = front ? 'front' : 'back'
                  onTrace(port.id, slot)
                  setHoverBox(null)
                }}
                style={{
                  marginTop: 3,
                  background: '#0EA5E9',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  letterSpacing: 0.5,
                }}
              >
                ↯ Trace
              </button>
            )}
          </div>,
          document.body
        )}
      </div>
    )
  }

  const s: Record<string, CSSProperties> = {
    card: {
      background: '#1E293B',
      border: '1px solid #334155',
      borderLeft: `4px solid ${device.color || '#4a9eff'}`,
      borderRadius: 6,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      transition: 'border-color 0.2s',
    },
    header: {
      padding: '8px 12px',
      background: 'rgba(255,255,255,0.02)',
      borderBottom: '1px solid #334155',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    titleGroup: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
    },
    name: {
      fontSize: 13,
      fontWeight: 700,
      color: '#F1F5F9',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    badge: {
      fontSize: 10,
      padding: '1px 6px',
      borderRadius: 4,
      background: '#0F172A',
      border: '1px solid #334155',
      color: '#64748B',
      whiteSpace: 'nowrap',
    },
    subtext: {
      fontSize: 11,
      color: '#64748B',
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    deleteBtn: {
      background: 'none',
      border: 'none',
      color: '#64748B',
      cursor: 'pointer',
      fontSize: 13,
      padding: '2px 4px',
      borderRadius: 4,
      lineHeight: 1,
    },
    nudgeBtn: {
      background: 'none',
      border: 'none',
      color: '#64748B',
      cursor: 'pointer',
      fontSize: 7,
      padding: 0,
      lineHeight: 1,
      height: 10,
    },
    portArea: {
      padding: '10px 12px',
      background: '#0f1319',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      overflowX: 'auto',
    },

    emptyPorts: {
      color: '#475569',
      fontSize: 11,
      fontStyle: 'italic',
      padding: '8px 0',
      textAlign: 'center',
    },
  }

  return (
    <div style={s.card}>
      {/* Device Header */}
      <div style={s.header}>
        <span style={{ fontSize: 14 }}>{CATEGORY_ICONS[device.category] ?? '📦'}</span>
        <div style={s.titleGroup}>
          <span style={s.name}>{device.name}</span>
          {device.template && (
            <span style={s.badge}>
              {device.template.manufacturer ? `${device.template.manufacturer} ` : ''}
              {device.template.model || device.template.name}
            </span>
          )}
          <span style={s.badge}>{portCount} ports</span>
          {device.positionU != null && <span style={s.badge}>U{device.positionU}</span>}
        </div>

        <div style={s.subtext}>
          <span style={{ textTransform: 'capitalize', fontSize: 11 }}>{device.category.replace('_', ' ')}</span>
          
          {onUpdateDevicePosition && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8, marginRight: 4, background: '#0F172A', border: '1px solid #334155', borderRadius: 4, padding: '2px 4px' }}>
              <span style={{ fontSize: 9, color: '#64748B', fontWeight: 600 }}>U:</span>
              <input
                type="number"
                value={localU}
                onChange={e => setLocalU(e.target.value)}
                onBlur={handleUBlur}
                onKeyDown={handleUKeyDown}
                style={{ width: 30, background: 'transparent', border: 'none', color: '#F1F5F9', fontSize: 11, outline: 'none', textAlign: 'center', MozAppearance: 'textfield' }}
                placeholder="-"
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <button type="button" style={s.nudgeBtn} onClick={async () => {
                  try { await onUpdateDevicePosition(device.id, (device.positionU || 0) + 1) } 
                  catch { setLocalU(device.positionU?.toString() || '') }
                }} title="Move Up">▲</button>
                <button type="button" style={s.nudgeBtn} onClick={async () => {
                  try { await onUpdateDevicePosition(device.id, Math.max(1, (device.positionU || 2) - 1)) }
                  catch { setLocalU(device.positionU?.toString() || '') }
                }} title="Move Down">▼</button>
              </div>
            </div>
          )}

          {onEditDevice && (
            <button
              type="button"
              style={s.deleteBtn}
              onClick={() => onEditDevice(device.id)}
              title="Edit device"
            >
              ✏️
            </button>
          )}

          {onDeleteDevice && (
            <div title={device.isProtected ? 'This is a core demo device and cannot be deleted.' : 'Delete device'}>
              <button
                type="button"
                style={{...s.deleteBtn, cursor: device.isProtected ? 'not-allowed' : 'pointer', opacity: device.isProtected ? 0.4 : 1}}
                disabled={device.isProtected}
                onClick={() => {
                  if (device.isProtected) return
                  if (confirm(`Remove "${device.name}" from this rack?`)) {
                    onDeleteDevice(device.id)
                  }
                }}
              >
                🗑
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Ports Area */}
      <div style={s.portArea}>
        {ports.length === 0 ? (
          <div style={s.emptyPorts}>No ports configured for this device.</div>
        ) : (
          <div style={{ display: 'flex', gap: 16 }}>
            {portGroups.map((g, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {portGroups.length > 1 && g.name !== 'Default' && (
                  <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', marginBottom: -2, letterSpacing: 0.5, fontWeight: 700 }}>{g.name}</div>
                )}
                {g.useTwoRows ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${g.numColumns}, minmax(36px, 1fr))`, gap: 4 }}>
                      {g.topRowPorts.map(renderPort)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${g.numColumns}, minmax(36px, 1fr))`, gap: 4 }}>
                      {g.bottomRowPorts.map(renderPort)}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${g.numColumns}, minmax(36px, 1fr))`, gap: 4 }}>
                    {g.topRowPorts.map(renderPort)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
