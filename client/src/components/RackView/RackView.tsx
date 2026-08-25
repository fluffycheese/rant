import { useState, useMemo, useEffect, type CSSProperties } from 'react'
import type { RackViewPayload, DeviceTemplate, Port, RackDevice, CableLink } from '../../api/client.ts'
import { api } from '../../api/client.ts'
import RackGrid from './RackGrid.tsx'
import ConnectionsTable from './ConnectionsTable.tsx'
import type { SelectedPortInfo } from './DeviceCard.tsx'
import RackFormModal from '../RackFormModal.tsx'
import DeviceEditorModal from './DeviceEditorModal.tsx'
import ColorPicker from '../ColorPicker.tsx'
import { usePatching } from '../../contexts/PatchingContext.tsx'

type Props = {
  payload: RackViewPayload
  templates: DeviceTemplate[]
  onReload: () => void
  isSecondaryView?: boolean
  onMakePrimary?: () => void
  onCloseSplitView?: () => void
}

export default function RackView({ payload, templates, onReload, isSecondaryView, onMakePrimary, onCloseSplitView }: Props) {
  const { rack, site, devices, internalLinks } = payload
  const { selectedPort, setSelectedPort, setIsManualSplitView, crossSiteTargetRackId, isManualSplitView, setHighlightedLinkId, setPinnedLinkId } = usePatching()
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [targetUPosition, setTargetUPosition] = useState<number | undefined>(undefined)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showEditRack, setShowEditRack] = useState(false)
  const [activeTab, setActiveTab] = useState<'both' | 'grid' | 'connections' | 'split'>(isSecondaryView ? 'grid' : 'both')
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)

  const isSplitActive = isManualSplitView || !!crossSiteTargetRackId

  useEffect(() => {
    if (isSecondaryView) return
    if (isSplitActive && activeTab === 'both') {
      setActiveTab('split')
      setIsManualSplitView(true)
    } else if (!isSplitActive && (activeTab === 'split' || activeTab === 'grid')) {
      setActiveTab('both')
      setIsManualSplitView(false)
    }
  }, [isSplitActive, isSecondaryView, activeTab, setIsManualSplitView])

  // Connection dialog state
  const [linkForm, setLinkForm] = useState<{
    portAId: string
    portASlot: 'front' | 'back'
    portBId: string
    portBSlot: 'front' | 'back'
    cableType: string
    color: string
    label: string
  }>({
    portAId: '',
    portASlot: 'front',
    portBId: '',
    portBSlot: 'front',
    cableType: 'cat6',
    color: '#4a9eff',
    label: '',
  })

  const [detailsPortInfo, setDetailsPortInfo] = useState<SelectedPortInfo | null>(null)

  // Handle port selection (Click-to-connect flow or details)
  const handleSelectPort = (info: SelectedPortInfo) => {
    if (selectedPort) {
      if (selectedPort.port.id === info.port.id && selectedPort.slot === info.slot) {
        // Deselect if clicked same port
        setSelectedPort(null)
      } else {
        // Second port selected — open link creation dialog
        setLinkForm({
          portAId: selectedPort.port.id,
          portASlot: selectedPort.slot,
          portBId: info.port.id,
          portBSlot: info.slot,
          cableType: 'cat6',
          color: '#4a9eff',
          label: '',
        })
        setShowLinkDialog(true)
        // Keep selectedPort active so the side-by-side view stays open during modal
      }
      return
    }

    // First click: check if port is empty
    const linkForSlot = internalLinks.find(l => 
      (l.portAId === info.port.id && l.portASlot === info.slot) ||
      (l.portBId === info.port.id && l.portBSlot === info.slot)
    )
    if (!linkForSlot) {
      setSelectedPort(info)
    } else {
      setPinnedLinkId(linkForSlot.id)
      setDetailsPortInfo(info)
    }
  }

  // Handle delete device
  const handleDeleteDevice = async (deviceId: string) => {
    try {
      await api.devices.delete(deviceId)
      onReload()
    } catch (err: any) {
      alert(`Failed to delete device: ${err.message}`)
    }
  }

  // Handle delete link
  const handleDeleteLink = async (linkId: string) => {
    try {
      await api.links.delete(linkId)
      onReload()
    } catch (err: any) {
      alert(`Failed to delete link: ${err.message}`)
    }
  }

  const handleUpdateDevicePosition = async (deviceId: string, positionU: number | null) => {
    if (positionU != null) {
      const movingDevice = devices.find(d => d.id === deviceId)
      const uH = movingDevice?.template?.uHeight || 1
      
      const collisions = devices.filter(d => {
        if (d.id === deviceId || d.positionU == null) return false
        const dH = d.template?.uHeight || 1
        const dStart = d.positionU
        const dEnd = d.positionU + dH - 1
        const mStart = positionU
        const mEnd = positionU + uH - 1
        return dStart <= mEnd && dEnd >= mStart
      })

      if (collisions.length > 0) {
        alert(`Cannot move device. Target space is occupied by "${collisions[0].name}".`)
        throw new Error('Collision detected')
      }
    }

    try {
      await api.devices.update(deviceId, { positionU })
      onReload()
    } catch (err: any) {
      alert(`Failed to move device: ${err.message}`)
      throw err
    }
  }

  // Handle instantiate device template into rack
  const handleInstantiateDevice = async (templateId: string, name: string, positionU?: number) => {
    if (positionU != null) {
      const template = templates.find(t => t.id === templateId)
      const uH = template?.uHeight || 1
      
      const collisions = devices.filter(d => {
        if (d.positionU == null) return false
        const dH = d.template?.uHeight || 1
        const dStart = d.positionU
        const dEnd = d.positionU + dH - 1
        const mStart = positionU
        const mEnd = positionU + uH - 1
        return dStart <= mEnd && dEnd >= mStart
      })

      if (collisions.length > 0) {
        alert(`Cannot mount device at U${positionU}. Space is occupied by "${collisions[0].name}".`)
        return
      }
    }

    try {
      await api.templates.instantiate(templateId, {
        rackId: rack.id,
        name,
        positionU,
      })
      setShowAddDevice(false)
      onReload()
    } catch (err: any) {
      alert(`Failed to add device: ${err.message}`)
    }
  }

  // Handle edit rack
  const handleEditRack = async (name: string, description: string, uHeight: number) => {
    try {
      await api.racks.update(rack.id, { name, description, uHeight })
      setShowEditRack(false)
      onReload()
    } catch (err: any) {
      alert(`Failed to update rack: ${err.message}`)
    }
  }

  // Handle create or update link
  const handleSubmitLink = async () => {
    if (!linkForm.portAId || !linkForm.portBId) {
      alert('Please select both source and target ports')
      return
    }

    try {
      if (editingLinkId) {
        await api.links.update(editingLinkId, {
          portAId: linkForm.portAId,
          portASlot: linkForm.portASlot,
          portBId: linkForm.portBId,
          portBSlot: linkForm.portBSlot,
          cableType: linkForm.cableType,
          color: linkForm.color || '#4a9eff',
          label: linkForm.label || undefined,
        })
      } else {
        await api.links.create({
          portAId: linkForm.portAId,
          portASlot: linkForm.portASlot,
          portBId: linkForm.portBId,
          portBSlot: linkForm.portBSlot,
          cableType: linkForm.cableType,
          color: linkForm.color || '#4a9eff',
          label: linkForm.label || undefined,
        })
      }
      setShowLinkDialog(false)
      setEditingLinkId(null)
      setSelectedPort(null)
      onReload()
    } catch (err: any) {
      alert(`Failed to save connection: ${err.message}`)
    }
  }

  const s: Record<string, CSSProperties> = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: '#0f1117',
    },
    toolbar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 16px',
      borderBottom: '1px solid #30363d',
      background: '#161b22',
      flexShrink: 0,
      gap: 12,
    },
    breadcrumb: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 14,
    },
    siteName: {
      color: '#8b949e',
      fontWeight: 500,
    },
    rackName: {
      color: '#e2e8f0',
      fontWeight: 700,
      fontSize: 15,
    },
    uBadge: {
      fontSize: 11,
      padding: '2px 6px',
      borderRadius: 4,
      background: '#0d1117',
      border: '1px solid #30363d',
      color: '#8b949e',
    },
    btnGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    tabGroup: {
      display: 'flex',
      alignItems: 'center',
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: 6,
      padding: 2,
    },
    tabBtn: {
      background: 'none',
      border: 'none',
      color: '#8b949e',
      padding: '4px 10px',
      fontSize: 12,
      fontWeight: 500,
      borderRadius: 4,
      cursor: 'pointer',
    },
    activeTabBtn: {
      background: '#21262d',
      color: '#e2e8f0',
      fontWeight: 600,
    },
    primaryBtn: {
      background: '#238636',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      padding: '6px 14px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
    },
    secondaryBtn: {
      background: 'none',
      color: '#8b949e',
      border: '1px solid #30363d',
      borderRadius: 6,
      padding: '6px 12px',
      fontSize: 13,
      cursor: 'pointer',
    },
    patchingBanner: {
      background: '#1f6feb22',
      borderBottom: '1px solid #1f6feb66',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      color: '#58a6ff',
      fontSize: 12,
      fontWeight: 500,
    },
    contentArea: {
      flex: 1,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      padding: 16,
      gap: 20,
    },
    // twoColumnLayout moved to css class
  }

  return (
    <div style={s.container}>
      <style>{`
        .two-column-layout {
          display: grid;
          grid-template-columns: minmax(400px, 1fr) minmax(360px, 500px);
          gap: 20px;
          align-items: start;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }
        @media (max-width: 1200px) {
          .two-column-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      {/* Top Toolbar */}
      <div style={s.toolbar}>
        <div style={s.breadcrumb}>
          <span style={s.siteName}>{site.name}</span>
          <span style={{ color: '#6e7681' }}>/</span>
          <span style={s.rackName}>{rack.name}</span>
          <span style={s.uBadge}>{rack.uHeight}U</span>
          <button
            type="button"
            onClick={() => setShowEditRack(true)}
            style={{ ...s.secondaryBtn, padding: '2px 8px', fontSize: 11, marginLeft: 8 }}
          >
            ✎ Edit
          </button>
          {isSecondaryView && onMakePrimary && (
            <button
              type="button"
              onClick={onMakePrimary}
              style={{ ...s.secondaryBtn, padding: '2px 8px', fontSize: 11, marginLeft: 8, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ⬅️ Make Primary
            </button>
          )}
          {isSecondaryView && onCloseSplitView && (
            <button
              type="button"
              onClick={() => {
                onCloseSplitView()
                setIsManualSplitView(false)
              }}
              style={{ ...s.secondaryBtn, padding: '2px 8px', fontSize: 11, marginLeft: 8, display: 'flex', alignItems: 'center', gap: 4, color: '#ff7b72', borderColor: '#ff7b72' }}
            >
              ❌ Close
            </button>
          )}
        </div>

        <div style={s.btnGroup}>
          <select
            value={activeTab}
            onChange={(e) => {
              const val = e.target.value as 'both' | 'grid' | 'connections' | 'split'
              setActiveTab(val)
              setIsManualSplitView(val === 'split')
            }}
            style={{
              background: '#0d1117', color: '#e2e8f0', border: '1px solid #30363d',
              borderRadius: 6, padding: '4px 8px', fontSize: 13, outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="both">View: Hybrid</option>
            <option value="grid">View: Rack Elevation</option>
            <option value="connections">View: Connections Table</option>
            <option value="split">View: Split (Compare)</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setTargetUPosition(undefined)
              setShowAddDevice(true)
            }}
            style={s.primaryBtn}
          >
            + Add Device
          </button>

          <button type="button" onClick={onReload} style={s.secondaryBtn} title="Reload rack">
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Active Patching Banner */}
      {selectedPort && (
        <div style={s.patchingBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔌</span>
            <span>
              Patching from <strong>{selectedPort.device.name}</strong> / <strong>Port {selectedPort.port.label}</strong>{' '}
              <select
                value={selectedPort.slot}
                onChange={(e) => setSelectedPort({ ...selectedPort, slot: e.target.value as 'front' | 'back' })}
                style={{
                  background: '#0d1117',
                  color: '#58a6ff',
                  border: '1px solid #1f6feb66',
                  borderRadius: 4,
                  padding: '2px 4px',
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="front">Front</option>
                <option value="back">Back</option>
              </select>
              . Click target port on any device to complete link or click another rack in the menu to create a cross-site connection.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPort(null)}
            style={{
              background: 'none',
              border: '1px solid #1f6feb',
              color: '#58a6ff',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main View Area */}
      <div style={s.contentArea}>
        {activeTab === 'both' ? (
          <div className="two-column-layout">
            <div>
              <RackGrid
                rack={rack}
                devices={devices}
                links={internalLinks}
                selectedPort={selectedPort}
                onSelectPort={handleSelectPort}
                onDeleteDevice={handleDeleteDevice}
                onUpdateDevicePosition={handleUpdateDevicePosition}
                onEditDevice={setEditingDeviceId}
                onAddDevice={(u) => {
                  setTargetUPosition(u)
                  setShowAddDevice(true)
                }}
              />
            </div>
            <div>
              <ConnectionsTable
                currentRack={rack}
                links={internalLinks}
                devices={devices}
                onDeleteLink={handleDeleteLink}
                onAddLink={() => {
                  setEditingLinkId(null)
                  setLinkForm({
                    portAId: devices[0]?.ports[0]?.id ?? '',
                    portASlot: 'front',
                    portBId: devices[1]?.ports[0]?.id ?? devices[0]?.ports[1]?.id ?? '',
                    portBSlot: 'front',
                    cableType: 'cat6',
                    color: '#4a9eff',
                    label: '',
                  })
                  setShowLinkDialog(true)
                }}
                onEditLink={(link) => {
                  const device = devices.find(d => d.ports.some(p => p.id === link.portAId))
                  const port = device?.ports.find(p => p.id === link.portAId)
                  if (device && port) {
                    setDetailsPortInfo({ device, port, slot: link.portASlot as 'front' | 'back' })
                  }
                }}
              />
            </div>
          </div>
        ) : (activeTab === 'grid' || activeTab === 'split') ? (
          <RackGrid
            rack={rack}
            devices={devices}
            links={internalLinks}
            selectedPort={selectedPort}
            onSelectPort={handleSelectPort}
            onDeleteDevice={handleDeleteDevice}
            onUpdateDevicePosition={handleUpdateDevicePosition}
            onEditDevice={setEditingDeviceId}
            onAddDevice={(u) => {
              setTargetUPosition(u)
              setShowAddDevice(true)
            }}
          />
        ) : (
          <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
            <ConnectionsTable
              currentRack={rack}
              links={internalLinks}
              devices={devices}
              onDeleteLink={handleDeleteLink}
              onAddLink={() => {
                setEditingLinkId(null)
                setLinkForm({
                  portAId: devices[0]?.ports[0]?.id ?? '',
                  portASlot: 'front',
                  portBId: devices[1]?.ports[0]?.id ?? devices[0]?.ports[1]?.id ?? '',
                  portBSlot: 'front',
                  cableType: 'cat6',
                  color: '#4a9eff',
                  label: '',
                })
                setShowLinkDialog(true)
              }}
              onEditLink={(link) => {
                const device = devices.find(d => d.ports.some(p => p.id === link.portAId))
                const port = device?.ports.find(p => p.id === link.portAId)
                if (device && port) {
                  setDetailsPortInfo({ device, port, slot: link.portASlot as 'front' | 'back' })
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Edit Device Dialog */}
      {editingDeviceId && (
        <DeviceEditorModal
          deviceId={editingDeviceId}
          devices={devices}
          rack={rack}
          onClose={() => setEditingDeviceId(null)}
          onReload={onReload}
        />
      )}

      {/* Add Device Dialog */}
      {showAddDevice && (
        <AddDeviceModal
          templates={templates}
          initialU={targetUPosition}
          onConfirm={handleInstantiateDevice}
          onCancel={() => {
            setShowAddDevice(false)
            setTargetUPosition(undefined)
          }}
        />
      )}

      {/* Edit Rack Dialog */}
      {showEditRack && (
        <RackFormModal
          mode="edit"
          initialRack={rack}
          onConfirm={handleEditRack}
          onDelete={async () => {
            try {
              await api.racks.delete(rack.id)
              window.location.href = '/'
            } catch (err: any) {
              alert(`Failed to delete rack: ${err.message}`)
            }
          }}
          onCancel={() => setShowEditRack(false)}
        />
      )}

      {/* Link Creation Dialog */}
      {showLinkDialog && (
        <LinkModal
          devices={devices}
          form={linkForm}
          isEditing={!!editingLinkId}
          onChange={setLinkForm}
          onConfirm={handleSubmitLink}
          onCancel={() => {
            setShowLinkDialog(false)
            setEditingLinkId(null)
            setSelectedPort(null)
          }}
        />
      )}

      {/* Port Details Dialog */}
      {detailsPortInfo && (
        <PortDetailsModal
          currentRack={rack}
          info={detailsPortInfo}
          links={internalLinks}
          devices={devices}
          onClose={() => setDetailsPortInfo(null)}
          onDeleteLink={handleDeleteLink}
          onAddLink={(slot) => {
            setDetailsPortInfo(null)
            setSelectedPort({ ...detailsPortInfo, slot })
          }}
          onEditLink={(link) => {
            setDetailsPortInfo(null)
            setEditingLinkId(link.id)
            setLinkForm({
              portAId: link.portAId,
              portASlot: link.portASlot,
              portBId: link.portBId,
              portBSlot: link.portBSlot,
              cableType: link.cableType,
              color: link.color || '#4a9eff',
              label: link.label || '',
            })
            setShowLinkDialog(true)
          }}
        />
      )}
    </div>
  )
}

// ── Modals ───────────────────────────────────────────────────────────────────

function AddDeviceModal({
  templates,
  initialU,
  onConfirm,
  onCancel,
}: {
  templates: DeviceTemplate[]
  initialU?: number
  onConfirm: (templateId: string, name: string, positionU?: number) => void
  onCancel: () => void
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [name, setName] = useState('')
  const [positionU, setPositionU] = useState<number | ''>(initialU ?? '')

  const selected = templates.find(t => t.id === templateId)

  const inputStyle: CSSProperties = {
    width: '100%',
    background: '#0d1117',
    color: '#e2e8f0',
    border: '1px solid #30363d',
    borderRadius: 6,
    padding: '7px 10px',
    fontSize: 13,
    outline: 'none',
  }

  const labelStyle: CSSProperties = {
    fontSize: 12,
    color: '#8b949e',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 24, minWidth: 380, maxWidth: 440, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Mount Device in Rack</div>

        {templates.length === 0 ? (
          <div style={{ color: '#8b949e', fontSize: 13 }}>
            No templates configured yet. <a href="/templates" style={{ color: '#58a6ff' }}>Create a template first →</a>
          </div>
        ) : (
          <>
            <label style={labelStyle}>
              Device Template
              <select style={inputStyle} value={templateId} onChange={e => setTemplateId(e.target.value)}>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.portCount}p, {t.uHeight}U)
                  </option>
                ))}
              </select>
            </label>

            {selected && (
              <div style={{ background: '#0d1117', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#8b949e' }}>
                {selected.manufacturer && <div>{selected.manufacturer} {selected.model}</div>}
                <div>{selected.portCount} ports · {selected.category} · {selected.uHeight}U</div>
              </div>
            )}

            <label style={labelStyle}>
              Device Name in Rack
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={selected?.name ?? 'e.g. Core Switch 1'}
                style={inputStyle}
                autoFocus
              />
            </label>

            <label style={labelStyle}>
              Rack Unit Position (Optional)
              <input
                type="number"
                min={1}
                max={100}
                value={positionU}
                onChange={e => setPositionU(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 12 (starts at U12)"
                style={inputStyle}
              />
            </label>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button"
                onClick={onCancel}
                style={{ background: 'none', color: '#8b949e', border: '1px solid #30363d', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!templateId || !name.trim()}
                onClick={() => onConfirm(templateId, name.trim(), typeof positionU === 'number' ? positionU : undefined)}
                style={{
                  background: '#238636',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 18px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  opacity: !templateId || !name.trim() ? 0.5 : 1,
                }}
              >
                Mount Device
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function LinkModal({
  devices,
  form,
  isEditing,
  onChange,
  onConfirm,
  onCancel,
}: {
  devices: RackDevice[]
  form: {
    portAId: string
    portASlot: 'front' | 'back'
    portBId: string
    portBSlot: 'front' | 'back'
    cableType: string
    color: string
    label: string
  }
  isEditing?: boolean
  onChange: (f: any) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const allPorts = devices.flatMap(d => d.ports.map(p => ({ ...p, deviceName: d.name })))
  
  // If we are cross-site patching, the port from the other rack might not be in allPorts
  if (form.portAId && !allPorts.find(p => p.id === form.portAId)) {
    allPorts.push({ id: form.portAId, label: 'Cross-Site Port A (Locked)', deviceName: 'Other Rack' } as any)
  }
  if (form.portBId && !allPorts.find(p => p.id === form.portBId)) {
    allPorts.push({ id: form.portBId, label: 'Cross-Site Port B (Locked)', deviceName: 'Other Rack' } as any)
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    background: '#0d1117',
    color: '#e2e8f0',
    border: '1px solid #30363d',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 13,
    outline: 'none',
  }

  const labelStyle: CSSProperties = {
    fontSize: 12,
    color: '#8b949e',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 24, minWidth: 380, maxWidth: 460, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{isEditing ? 'Edit Cable Link' : 'Connect Ports (Cable Link)'}</div>

        {/* Endpoint A */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8 }}>
          <label style={labelStyle}>
            Port A
            <select
              style={{ ...inputStyle, opacity: isEditing ? 0.7 : 1 }}
              value={form.portAId}
              onChange={e => onChange({ ...form, portAId: e.target.value })}
              disabled={isEditing}
            >
              {allPorts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.deviceName} · Port {p.label}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Slot
            <select
              style={inputStyle}
              value={form.portASlot}
              onChange={e => onChange({ ...form, portASlot: e.target.value as 'front'|'back' })}
            >
              <option value="front">Front</option>
              <option value="back">Back</option>
            </select>
          </label>
        </div>

        {/* Endpoint B */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8 }}>
          <label style={labelStyle}>
            Port B
            <select
              style={{ ...inputStyle, opacity: isEditing ? 0.7 : 1 }}
              value={form.portBId}
              onChange={e => onChange({ ...form, portBId: e.target.value })}
              disabled={isEditing}
            >
              {allPorts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.deviceName} · Port {p.label}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Slot
            <select
              style={inputStyle}
              value={form.portBSlot}
              onChange={e => onChange({ ...form, portBSlot: e.target.value as 'front'|'back' })}
            >
              <option value="front">Front</option>
              <option value="back">Back</option>
            </select>
          </label>
        </div>

        {/* Cable Options */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={labelStyle}>
            Cable Type
            <select
              style={inputStyle}
              value={form.cableType}
              onChange={e => onChange({ ...form, cableType: e.target.value })}
            >
              {['cat5e', 'cat6', 'cat6a', 'om3', 'om4', 'smf', 'dac', 'other'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Cable Colour
            <ColorPicker value={form.color} onChange={color => onChange({ ...form, color })} />
          </label>
        </div>

        <label style={labelStyle}>
          Label (Optional)
          <input
            type="text"
            value={form.label}
            onChange={e => onChange({ ...form, label: e.target.value })}
            placeholder="e.g. core-to-patch-01"
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'none', color: '#8b949e', border: '1px solid #30363d', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', cursor: 'pointer', fontWeight: 600 }}
          >
            {isEditing ? 'Save Changes' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}


function PortDetailsModal({
  currentRack,
  info,
  links,
  devices,
  onClose,
  onDeleteLink,
  onAddLink,
  onEditLink,
}: {
  currentRack: import('../../api/client.ts').Rack
  info: SelectedPortInfo
  links: CableLink[]
  devices: RackDevice[]
  onClose: () => void
  onDeleteLink: (id: string) => void
  onAddLink: (slot: 'front' | 'back') => void
  onEditLink: (link: CableLink) => void
}) {
  const frontLink = links.find(l => (l.portAId === info.port.id && l.portASlot === 'front') || (l.portBId === info.port.id && l.portBSlot === 'front'))
  const backLink = links.find(l => (l.portAId === info.port.id && l.portASlot === 'back') || (l.portBId === info.port.id && l.portBSlot === 'back'))

  const getTargetDesc = (link: CableLink, currentSlot: 'front'|'back') => {
    const isA = link.portAId === info.port.id && link.portASlot === currentSlot
    const targetPortId = isA ? link.portBId : link.portAId
    const targetSlot = isA ? link.portBSlot : link.portASlot
    for (const d of devices) {
      const p = d.ports.find(p => p.id === targetPortId)
      if (p) {
        return d.rack.id !== currentRack.id 
          ? `${d.site.name} / ${d.rack.name} / ${d.name} / Port ${p.label} [${targetSlot}]`
          : `${d.name} / Port ${p.label} [${targetSlot}]`
      }
    }
    return 'Unknown'
  }

  const renderSlot = (slotName: 'front' | 'back', link?: CableLink) => (
    <div style={{ background: '#0d1117', padding: 12, borderRadius: 6, border: '1px solid #30363d' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 8, textTransform: 'capitalize' }}>
        {slotName} Slot
      </div>
      {link ? (
        <div style={{ fontSize: 12, color: '#c9d1d9', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div><strong>Connected to:</strong> {getTargetDesc(link, slotName)}</div>
          <div><strong>Cable:</strong> {link.cableType} <span style={{display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: link.color || '#4a9eff'}}></span></div>
          {link.label && <div><strong>Label:</strong> {link.label}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={() => onEditLink(link)} style={{ background: 'none', border: '1px solid #8b949e', color: '#8b949e', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>✎ Edit</button>
            <button type="button" onClick={() => { if(confirm('Delete connection?')) onDeleteLink(link.id) }} style={{ background: 'none', border: '1px solid #f85149', color: '#f85149', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>Disconnect</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#8b949e' }}>Empty</span>
          <button type="button" onClick={() => onAddLink(slotName)} style={{ background: '#238636', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>+ Add Connection</button>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 24, minWidth: 380, maxWidth: 460, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Port Connections - {info.device.name} / Port {info.port.label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {renderSlot('front', frontLink)}
          {renderSlot('back', backLink)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ background: 'none', color: '#8b949e', border: '1px solid #30363d', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  )
}
