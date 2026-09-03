import { useState, type CSSProperties } from 'react'
import { api, type RackDevice, type Rack } from '../../api/client.ts'
import ColorPicker from '../ColorPicker.tsx'

const CONNECTORS = ['rj45', 'sfp', 'sfp+', 'qsfp', 'lc', 'sc', 'other']

type Props = {
  deviceId: string
  devices: RackDevice[]
  rack: Rack
  onClose: () => void
  onReload: () => void
}

export default function DeviceEditorModal({
  deviceId,
  devices,
  rack,
  onClose,
  onReload,
}: Props) {
  const device = devices.find(d => d.id === deviceId)
  if (!device) return null

  const [name, setName] = useState(device.name)
  const [color, setColor] = useState(device.color || '#4a9eff')
  const [positionU, setPositionU] = useState<number | ''>(device.positionU ?? '')
  const [ports, setPorts] = useState(
    [...(device.ports ?? [])].sort((a, b) => a.position - b.position).map(p => ({
      id: p.id,
      label: p.label,
      connectorType: p.connectorType || 'rj45',
      position: p.position,
      groupName: p.groupName,
    }))
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePortChange = (index: number, field: 'label' | 'connectorType', value: string) => {
    setPorts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Device name is required')
      return
    }

    const posU = positionU === '' ? null : Number(positionU)
    if (posU !== null) {
      if (isNaN(posU) || posU < 1 || posU > rack.uHeight) {
        setError(`Position U must be between 1 and ${rack.uHeight}`)
        return
      }

      const uH = device.template?.uHeight || 1
      if (posU + uH - 1 > rack.uHeight) {
        setError(`Device occupies ${uH}U and would exceed rack height of ${rack.uHeight}U at U${posU}`)
        return
      }

      // Collision check
      const collisions = devices.filter(d => {
        if (d.id === device.id || d.positionU == null) return false
        const dH = d.template?.uHeight || 1
        const dStart = d.positionU
        const dEnd = d.positionU + dH - 1
        const mStart = posU
        const mEnd = posU + uH - 1
        return dStart <= mEnd && dEnd >= mStart
      })

      if (collisions.length > 0) {
        setError(`Cannot place device at U${posU}. Space is occupied by "${collisions[0].name}".`)
        return
      }
    }

    setIsSaving(true)
    setError(null)

    try {
      // 1. Update device if changed
      const deviceChanged =
        name.trim() !== device.name ||
        color !== (device.color || '#4a9eff') ||
        posU !== (device.positionU ?? null)

      if (deviceChanged) {
        await api.devices.update(device.id, {
          name: name.trim(),
          color,
          positionU: posU,
        })
      }

      // 2. Update changed ports
      const portUpdates: Promise<any>[] = []
      for (const p of ports) {
        const origPort = device.ports?.find(op => op.id === p.id)
        if (origPort) {
          const labelChanged = p.label.trim() !== origPort.label
          const connChanged = p.connectorType !== origPort.connectorType
          if (labelChanged || connChanged) {
            portUpdates.push(
              api.ports.update(p.id, {
                label: p.label.trim(),
                connectorType: p.connectorType,
              })
            )
          }
        }
      }

      if (portUpdates.length > 0) {
        await Promise.all(portUpdates)
      }

      onReload()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update device')
      setIsSaving(false)
    }
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    background: '#0F172A',
    color: '#F1F5F9',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 13,
    outline: 'none',
  }

  const labelStyle: CSSProperties = {
    fontSize: 12,
    color: '#64748B',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{
        background: '#1E293B',
        border: '1px solid #334155',
        borderRadius: 10,
        padding: 24,
        width: '90%',
        maxWidth: 540,
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>Edit Device</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              {device.template ? `${device.template.manufacturer ? `${device.template.manufacturer} ` : ''}${device.template.model || device.template.name}` : device.category}
              {' · '}{ports.length} ports
              {' · '}{device.template?.uHeight || 1}U
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{ background: '#F8717122', border: '1px solid #F87171', color: '#F87171', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ ...labelStyle, gridColumn: 'span 2' }}>
              Device Name *
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Core Switch 1"
                style={inputStyle}
                autoFocus
                required
              />
            </label>

            <label style={labelStyle}>
              Rack Unit Position (U)
              <input
                type="number"
                min={1}
                max={rack.uHeight}
                value={positionU}
                onChange={e => setPositionU(e.target.value ? Number(e.target.value) : '')}
                placeholder="Unplaced (-)"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Colour
              <ColorPicker value={color} onChange={setColor} />
            </label>
          </div>

          {/* Ports Section */}
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Ports ({ports.length})</span>
            </div>

            {ports.length === 0 ? (
              <div style={{ color: '#64748B', fontSize: 12, fontStyle: 'italic', padding: '8px 0' }}>
                No ports configured for this device.
              </div>
            ) : (
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
                {ports.map((port, idx) => (
                  <div key={port.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#475569', width: 28, textAlign: 'right', flexShrink: 0 }}>
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={port.label}
                      onChange={e => handlePortChange(idx, 'label', e.target.value)}
                      placeholder={`Port ${idx + 1}`}
                      style={{ ...inputStyle, flex: 1, padding: '4px 8px' }}
                      required
                    />
                    <select
                      value={port.connectorType}
                      onChange={e => handlePortChange(idx, 'connectorType', e.target.value)}
                      style={{ ...inputStyle, width: 100, padding: '4px 6px', flexShrink: 0 }}
                    >
                      {CONNECTORS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {port.groupName && (
                      <span style={{ fontSize: 10, color: '#64748B', background: '#0F172A', border: '1px solid #334155', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                        {port.groupName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                background: 'none',
                color: '#64748B',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: '6px 16px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              style={{
                background: '#10B981',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 18px',
                cursor: isSaving || !name.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: isSaving || !name.trim() ? 0.5 : 1,
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
