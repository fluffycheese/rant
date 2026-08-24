import { useState, type CSSProperties } from 'react'
import type { Rack } from '../api/client.ts'

type Props = {
  initialRack?: Partial<Rack>
  mode: 'create' | 'edit'
  onConfirm: (name: string, description: string, uHeight: number) => void
  onCancel: () => void
}

export default function RackFormModal({
  initialRack,
  mode,
  onConfirm,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialRack?.name || '')
  const [description, setDescription] = useState(initialRack?.description || '')
  const [uHeight, setUHeight] = useState(initialRack?.uHeight || 42)

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
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
          {mode === 'create' ? 'Create New Rack' : 'Edit Rack Settings'}
        </div>

        <label style={labelStyle}>
          Name
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
            placeholder="e.g. Rack A1"
            autoFocus
          />
        </label>

        <label style={labelStyle}>
          Description
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={inputStyle}
            placeholder="Optional details..."
          />
        </label>

        <label style={labelStyle}>
          Height (U)
          <input
            type="number"
            min={1}
            max={100}
            value={uHeight}
            onChange={e => setUHeight(Number(e.target.value))}
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
            disabled={!name.trim()}
            onClick={() => onConfirm(name.trim(), description.trim(), uHeight)}
            style={{
              background: '#238636',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 18px',
              cursor: 'pointer',
              fontWeight: 600,
              opacity: !name.trim() ? 0.5 : 1,
            }}
          >
            {mode === 'create' ? 'Create Rack' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
