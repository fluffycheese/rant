import { useState, type CSSProperties } from 'react'
import type { Rack } from '../api/client.ts'

type Props = {
  initialRack?: Partial<Rack>
  mode: 'create' | 'edit'
  onConfirm: (name: string, description: string, uHeight: number) => void
  onDelete?: () => void
  onCancel: () => void
}

export default function RackFormModal({
  initialRack,
  mode,
  onConfirm,
  onDelete,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialRack?.name || '')
  const [description, setDescription] = useState(initialRack?.description || '')
  const [uHeight, setUHeight] = useState(initialRack?.uHeight || 42)

  const inputStyle: CSSProperties = {
    width: '100%',
    background: '#0F172A',
    color: '#F1F5F9',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '7px 10px',
    fontSize: 13,
    outline: 'none',
  }

  const labelStyle: CSSProperties = {
    fontSize: 12,
    color: '#64748B',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: 24, minWidth: 380, maxWidth: 440, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>
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

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 6 }}>
          <div>
            {mode === 'edit' && onDelete && (
              <div title={initialRack?.isProtected ? 'This is a core demo rack and cannot be deleted.' : 'Delete Rack'}>
                <button
                  type="button"
                  disabled={initialRack?.isProtected}
                  onClick={() => {
                    if (initialRack?.isProtected) return
                    if (confirm('Are you sure you want to delete this rack? This cannot be undone.')) {
                      onDelete()
                    }
                  }}
                  style={{ 
                    background: 'none', 
                    color: initialRack?.isProtected ? '#94A3B8' : '#F87171', 
                    border: `1px solid ${initialRack?.isProtected ? '#475569' : '#F87171'}`, 
                    borderRadius: 6, 
                    padding: '6px 16px', 
                    cursor: initialRack?.isProtected ? 'not-allowed' : 'pointer',
                    opacity: initialRack?.isProtected ? 0.5 : 1
                  }}
                >
                  Delete Rack
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{ background: 'none', color: '#64748B', border: '1px solid #334155', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!name.trim()}
              onClick={() => onConfirm(name.trim(), description.trim(), uHeight)}
              style={{
                background: '#10B981',
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
    </div>
  )
}
