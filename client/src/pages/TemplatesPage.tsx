import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ColorPicker from '../components/ColorPicker.tsx'
import { api, type DeviceTemplate } from '../api/client.ts'

const CATEGORIES = ['switch', 'patch_panel', 'router', 'server', 'wall_panel', 'wifi_ap', 'ip_camera', 'other']
const CONNECTORS = ['rj45', 'sfp', 'sfp+', 'qsfp', 'lc', 'sc', 'other']

const CAT_ICONS: Record<string, string> = {
  switch: '🔀', patch_panel: '🔌', router: '📡', server: '🖥', wall_panel: '🧱', wifi_ap: '📶', ip_camera: '📹', other: '📦'
}

type PortDef = { label: string; connectorType: string; position: number; groupName?: string | null; groupLayout?: 'single_row' | 'double_row' | null }

type FormState = {
  name: string; category: string; manufacturer: string; model: string;
  uHeight: number; color: string; portLayout: PortDef[]
}

const blankForm = (): FormState => ({
  name: '', category: 'patch_panel', manufacturer: '', model: '',
  uHeight: 1, color: '#4a9eff',
  portLayout: Array.from({ length: 24 }, (_, i) => ({ label: String(i + 1), connectorType: 'rj45', position: i, groupName: null, groupLayout: null })),
})

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<DeviceTemplate[]>([])
  const [editing, setEditing]     = useState<FormState | null>(null)
  const [editId, setEditId]       = useState<string | null>(null)

  const load = () => api.templates.list().then(setTemplates)
  useEffect(() => { load() }, [])

  const handleNew = () => { setEditing(blankForm()); setEditId(null) }

  const handleEdit = (t: DeviceTemplate) => {
    setEditing({
      name: t.name, category: t.category, manufacturer: t.manufacturer ?? '',
      model: t.model ?? '', uHeight: t.uHeight, color: t.color,
      portLayout: t.portLayout as PortDef[],
    })
    setEditId(t.id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return
    await api.templates.delete(id)
    load()
  }

  const handleSave = async (form: FormState) => {
    const payload = {
      ...form, portCount: form.portLayout.length,
      manufacturer: form.manufacturer || undefined,
      model:        form.model || undefined,
    }
    if (editId) {
      await api.templates.update(editId, payload)
    } else {
      await api.templates.create(payload)
    }
    setEditing(null)
    setEditId(null)
    load()
  }

  const handleImport = async () => {
    const json = prompt('Paste template JSON:')
    if (!json) return
    try {
      const parsed = JSON.parse(json)
      const payload = {
        ...parsed,
        portCount: parsed.portLayout?.length || parsed.portCount || 0,
      }
      await api.templates.create(payload)
      load()
    } catch (e: any) {
      alert('Import failed: ' + e.message)
    }
  }

  const handleExport = (t: DeviceTemplate) => {
    const clean = {
      name: t.name, category: t.category, manufacturer: t.manufacturer, model: t.model,
      uHeight: t.uHeight, color: t.color, portLayout: t.portLayout
    }
    navigator.clipboard.writeText(JSON.stringify(clean, null, 2))
    alert('JSON copied to clipboard!')
  }

  const s: Record<string, React.CSSProperties> = {
    page:   { padding: 32, maxWidth: 900, margin: '0 auto' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    title:  { fontSize: 22, fontWeight: 700, color: '#e2e8f0' },
    addBtn: { background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
    card:   { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 },
    badge:  { background: '#0d1117', borderRadius: 5, padding: '2px 8px', fontSize: 11, color: '#8b949e', border: '1px solid #30363d' },
    iconBtn:{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 8px', color: '#8b949e' },
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.title}>Device Templates</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...s.addBtn, background: '#21262d', border: '1px solid #30363d' }} onClick={handleImport}>📥 Import JSON</button>
          <button style={s.addBtn} onClick={handleNew}>+ New template</button>
        </div>
      </div>

      {templates.length === 0 && (
        <div style={{ color: '#8b949e', textAlign: 'center', marginTop: 60, fontSize: 15 }}>
          No templates yet. Create one to start adding devices to racks.
        </div>
      )}

      {templates.map(t => (
        <div key={t.id} style={s.card}>
          <div style={{ fontSize: 22 }}>{CAT_ICONS[t.category] ?? '📦'}</div>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{t.name}</div>
            {(t.manufacturer || t.model) && (
              <div style={{ fontSize: 12, color: '#8b949e' }}>{t.manufacturer} {t.model}</div>
            )}
          </div>
          <span style={s.badge}>{t.portCount} ports</span>
          <span style={s.badge}>{t.uHeight}U</span>
          <span style={s.badge}>{t.category}</span>
          <button style={s.iconBtn} onClick={() => handleExport(t)} title="Export JSON">📋</button>
          <button style={s.iconBtn} onClick={() => handleEdit(t)} title="Edit">✏️</button>
          <button style={s.iconBtn} onClick={() => handleDelete(t.id)} title="Delete">🗑</button>
        </div>
      ))}

      {editing && (
        <TemplateEditor
          form={editing}
          onChange={setEditing}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setEditId(null) }}
          isEdit={!!editId}
        />
      )}
    </div>
  )
}

function TemplateEditor({ form, onChange, onSave, onCancel, isEdit }: {
  form: FormState
  onChange: (f: FormState) => void
  onSave: (f: FormState) => void
  onCancel: () => void
  isEdit: boolean
}) {
  const [advancedMode, setAdvancedMode] = useState(
    form.portLayout.some(p => p.groupName || p.groupLayout)
  )

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => onChange({ ...form, [k]: v })

  const setPortCount = (n: number) => {
    const current = form.portLayout
    if (n > current.length) {
      const extra = Array.from({ length: n - current.length }, (_, i) => ({
        label: String(current.length + i + 1), connectorType: 'rj45', position: current.length + i,
        groupName: advancedMode ? current[current.length - 1]?.groupName || null : null,
        groupLayout: advancedMode ? current[current.length - 1]?.groupLayout || null : null,
      }))
      set('portLayout', [...current, ...extra])
    } else {
      set('portLayout', current.slice(0, n))
    }
  }

  const setPort = (i: number, field: keyof PortDef, value: string | number | null) => {
    const updated = form.portLayout.map((p, idx) => idx === i ? { ...p, [field]: value } : p)
    set('portLayout', updated)
  }

  const setAllLayout = (layout: 'single_row' | 'double_row' | null) => {
    set('portLayout', form.portLayout.map(p => ({ ...p, groupLayout: layout })))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0d1117', color: '#e2e8f0',
    border: '1px solid #30363d', borderRadius: 6, padding: '6px 8px', fontSize: 13,
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#8b949e', display: 'flex', flexDirection: 'column', gap: 4 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0009', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
        padding: 28, width: '90%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
          {isEdit ? 'Edit Template' : 'New Template'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={labelStyle}>
            Name *
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
          </label>
          <label style={labelStyle}>
            Category
            <select style={inputStyle} value={form.category} onChange={e => {
              const newCat = e.target.value;
              let newLayout = form.portLayout;
              if (['wifi_ap', 'ip_camera', 'wall_panel'].includes(newCat) && newLayout.length > 1) {
                newLayout = newLayout.slice(0, 1);
              }
              onChange({ ...form, category: newCat, portLayout: newLayout });
            }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Manufacturer
            <input style={inputStyle} value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Cisco" />
          </label>
          <label style={labelStyle}>
            Model
            <input style={inputStyle} value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. SG350-48" />
          </label>
          <label style={labelStyle}>
            U-height
            <input type="number" min={1} max={42} style={inputStyle} value={form.uHeight} onChange={e => set('uHeight', Number(e.target.value))} />
          </label>
          <label style={labelStyle}>
            Colour
            <ColorPicker value={form.color} onChange={color => set('color', color)} />
          </label>
        </div>

        {/* Port layout */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9' }}>Ports</div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 6 }}>
                Count:
                <input type="number" min={1} max={256} value={form.portLayout.length}
                  onChange={e => setPortCount(Number(e.target.value))}
                  style={{ ...inputStyle, width: 70 }} />
              </label>
              {!advancedMode && (
                <label style={{ fontSize: 12, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Layout:
                  <select
                    value={form.portLayout[0]?.groupLayout || ''}
                    onChange={e => setAllLayout(e.target.value ? (e.target.value as any) : null)}
                    style={{ ...inputStyle, width: 110 }}
                  >
                    <option value="">Auto (Default)</option>
                    <option value="single_row">Single Row</option>
                    <option value="double_row">Double Row</option>
                  </select>
                </label>
              )}
            </div>
            
            <label style={{ fontSize: 12, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={advancedMode} onChange={e => setAdvancedMode(e.target.checked)} />
              Advanced Groups
            </label>
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'grid', gridTemplateColumns: advancedMode ? '1fr' : '1fr 1fr', gap: 6 }}>
            {form.portLayout.map((port, i) => (
              <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input type="text" value={port.label} onChange={e => setPort(i, 'label', e.target.value)}
                  style={{ ...inputStyle, flex: 1, padding: '4px 6px' }} placeholder={`Port ${i + 1}`} />
                <select value={port.connectorType} onChange={e => setPort(i, 'connectorType', e.target.value)}
                  style={{ ...inputStyle, width: 80, padding: '4px 4px', flex: 'none' }}>
                  {CONNECTORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                
                {advancedMode && (
                  <>
                    <input type="text" value={port.groupName || ''} onChange={e => setPort(i, 'groupName', e.target.value || null)}
                      style={{ ...inputStyle, width: 120, padding: '4px 6px', flex: 'none' }} placeholder="Group Name" />
                    <select value={port.groupLayout || ''} onChange={e => setPort(i, 'groupLayout', e.target.value ? (e.target.value as any) : null)}
                      style={{ ...inputStyle, width: 110, padding: '4px 4px', flex: 'none' }}>
                      <option value="">Auto Layout</option>
                      <option value="single_row">Single Row</option>
                      <option value="double_row">Double Row</option>
                    </select>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onCancel} style={{ background: 'none', color: '#8b949e', border: '1px solid #30363d', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            disabled={!form.name.trim()}
            onClick={() => onSave(form)}
            style={{ background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', cursor: 'pointer', fontWeight: 600, opacity: !form.name.trim() ? 0.5 : 1 }}
          >
            {isEdit ? 'Save changes' : 'Create template'}
          </button>
        </div>
      </div>
    </div>
  )
}
