import { useMemo, type CSSProperties } from 'react'
import type { Rack, RackDevice, CableLink } from '../../api/client.ts'
import DeviceCard, { type SelectedPortInfo } from './DeviceCard.tsx'

type Props = {
  rack: Rack
  devices: RackDevice[]
  links: CableLink[]
  selectedPort?: SelectedPortInfo | null
  onSelectPort?: (info: SelectedPortInfo) => void
  onDeleteDevice?: (deviceId: string) => void
  onAddDevice?: (uPosition?: number) => void
  onUpdateDevicePosition?: (deviceId: string, u: number | null) => void
  onEditDevice?: (deviceId: string) => void
}

export default function RackGrid({
  rack,
  devices,
  links,
  selectedPort,
  onSelectPort,
  onDeleteDevice,
  onAddDevice,
  onUpdateDevicePosition,
  onEditDevice,
}: Props) {
  const totalU = rack.uHeight || 42

  // Check if devices use explicit positionU
  const hasExplicitPositions = useMemo(() => {
    return devices.some(d => d.positionU != null && d.positionU > 0)
  }, [devices])

  // Build rack unit map if explicit positions are present
  const { uSlotMap, unplacedDevices } = useMemo(() => {
    const map = new Map<number, { device: RackDevice; isStart: boolean }>()
    const unplaced: RackDevice[] = []

    const ENDPOINT_CATEGORIES = ['wall_panel', 'wifi_ap', 'ip_camera']

    for (const dev of devices) {
      if (dev.rackId !== rack.id) continue // Skip remote devices in the grid
      if (ENDPOINT_CATEGORIES.includes(dev.category)) continue // Skip endpoints in the main grid

      if (dev.positionU != null && dev.positionU > 0) {
        const uH = dev.template?.uHeight || 1
        
        // Check if any required slot is already occupied or out of bounds
        let hasConflict = false
        for (let i = 0; i < uH; i++) {
          const u = dev.positionU + i
          if (u > totalU || map.has(u)) {
            hasConflict = true
            break
          }
        }

        if (hasConflict) {
          // Instead of letting it vanish or overwrite another device, show it as unplaced
          unplaced.push(dev)
        } else {
          for (let i = 0; i < uH; i++) {
            const u = dev.positionU + i
            map.set(u, { device: dev, isStart: i === 0 })
          }
        }
      } else {
        unplaced.push(dev)
      }
    }

    return { uSlotMap: map, unplacedDevices: unplaced }
  }, [devices, totalU])

  const s: Record<string, CSSProperties> = {
    rackContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 20px 40px',
      overflowY: 'auto',
      flex: 1,
    },
    cabinet: {
      width: '100%',
      maxWidth: 1200,
      background: '#090d13',
      border: '2px solid #30363d',
      borderRadius: 8,
      boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    topRail: {
      height: 24,
      background: 'linear-gradient(180deg, #21262d 0%, #161b22 100%)',
      borderBottom: '1px solid #30363d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      fontSize: 11,
      fontWeight: 700,
      color: '#8b949e',
      letterSpacing: 1,
    },
    rackBody: {
      display: 'flex',
      flexDirection: 'row',
      position: 'relative',
      minHeight: 200,
    },
    sideRail: {
      width: 38,
      background: '#161b22',
      borderRight: '1px solid #30363d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      userSelect: 'none',
      flexShrink: 0,
    },
    sideRailRight: {
      width: 38,
      background: '#161b22',
      borderLeft: '1px solid #30363d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      userSelect: 'none',
      flexShrink: 0,
    },
    equipmentBay: {
      flex: 1,
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      background: '#0a0e14',
      minWidth: 0,
    },
    emptyState: {
      padding: '48px 24px',
      textAlign: 'center',
      color: '#8b949e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    },
    emptyButton: {
      background: '#238636',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      padding: '8px 16px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
    },
    uMarker: {
      fontSize: 9,
      color: '#6e7681',
      fontFamily: 'monospace',
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      borderBottom: '1px dashed #21262d',
    },
    bottomRail: {
      height: 20,
      background: 'linear-gradient(180deg, #161b22 0%, #0d1117 100%)',
      borderTop: '1px solid #30363d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 10,
      color: '#6e7681',
    },
  }

  // Render rack elevation when explicit positions are used
  const renderPositionalElevation = () => {
    const rows = []
    const renderedDeviceIds = new Set<string>()

    for (let u = totalU; u >= 1; u--) {
      const slot = uSlotMap.get(u)

      if (slot) {
        if (slot.isStart && !renderedDeviceIds.has(slot.device.id)) {
          renderedDeviceIds.add(slot.device.id)
          rows.push(
            <div key={`u-${u}`} style={{ position: 'relative' }}>
              <DeviceCard
  onEditDevice={onEditDevice}
                device={slot.device}
                links={links}
                allDevices={devices}
                selectedPort={selectedPort}
                onSelectPort={onSelectPort}
                onDeleteDevice={onDeleteDevice}
                onUpdateDevicePosition={onUpdateDevicePosition}
              />
            </div>
          )
        }
      } else {
        rows.push(
          <div
            key={`empty-u-${u}`}
            style={{
              height: 36,
              border: '1px dashed #21262d',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              fontSize: 11,
              color: '#484f58',
              userSelect: 'none',
            }}
          >
            <span>U{u} — Empty</span>
            {onAddDevice && (
              <button
                type="button"
                onClick={() => onAddDevice(u)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#58a6ff',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '2px 6px',
                }}
              >
                + Mount
              </button>
            )}
          </div>
        )
      }
    }

    return rows
  }

  return (
    <div style={s.rackContainer}>
      <div style={s.cabinet}>
        {/* Top Rack Header */}
        <div style={s.topRail}>
          <span>19" RACK — {rack.name}</span>
          <span>{totalU}U CAPACITY</span>
        </div>

        {/* Rack Bay */}
        <div style={s.rackBody}>
          {/* Left Mounting Post */}
          <div style={s.sideRail}>
            {Array.from({ length: Math.min(totalU, 24) }, (_, i) => (
              <div key={i} style={s.uMarker}>
                ▪
              </div>
            ))}
          </div>

          {/* Equipment Slots */}
          <div style={s.equipmentBay}>
            {devices.length === 0 ? (
              <div style={s.emptyState}>
                <div style={{ fontSize: 32 }}>🗄️</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>Rack is Empty</div>
                <div style={{ fontSize: 12, maxWidth: 320 }}>
                  No equipment has been mounted in {rack.name} yet. Add a device from your templates to begin patching.
                </div>
                {onAddDevice && (
                  <button type="button" onClick={() => onAddDevice()} style={s.emptyButton}>
                    + Mount Device
                  </button>
                )}
              </div>
            ) : hasExplicitPositions ? (
              <>
                {renderPositionalElevation()}
                {unplacedDevices.length > 0 && (
                  <div style={{ marginTop: 16, borderTop: '1px solid #30363d', paddingTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#8b949e', marginBottom: 8 }}>
                      Unplaced Devices ({unplacedDevices.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {unplacedDevices.map(dev => (
                        <DeviceCard
  onEditDevice={onEditDevice}
                          key={dev.id}
                          device={dev}
                          links={links}
                          allDevices={devices}
                          selectedPort={selectedPort}
                          onSelectPort={onSelectPort}
                          onDeleteDevice={onDeleteDevice}
                          onUpdateDevicePosition={onUpdateDevicePosition}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Sequential Vertical Stack */
              devices.filter(d => d.rackId === rack.id && !['wall_panel', 'wifi_ap', 'ip_camera'].includes(d.category)).map((device, idx) => (
                <div key={device.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', fontSize: 10, color: '#6e7681' }}>
                    <span>Slot {idx + 1}</span>
                    <span>{device.template?.uHeight || 1}U</span>
                  </div>
                  <DeviceCard
  onEditDevice={onEditDevice}
                    device={device}
                    links={links}
                    allDevices={devices}
                    selectedPort={selectedPort}
                    onSelectPort={onSelectPort}
                    onDeleteDevice={onDeleteDevice}
                    onUpdateDevicePosition={onUpdateDevicePosition}
                  />
                </div>
              ))
            )}
          </div>

          {/* Right Mounting Post */}
          <div style={s.sideRailRight}>
            {Array.from({ length: Math.min(totalU, 24) }, (_, i) => (
              <div key={i} style={s.uMarker}>
                ▪
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Rail */}
        <div style={s.bottomRail}>
          <span>{devices.length} {devices.length === 1 ? 'device' : 'devices'} installed · {links.length} internal {links.length === 1 ? 'connection' : 'connections'}</span>
        </div>
      </div>
    </div>
  )
}
