import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Site, Rack } from '../../api/client.ts'
import { usePatching } from '../../contexts/PatchingContext.tsx'

const s: Record<string, React.CSSProperties> = {
  siteRow:  { padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', color: '#CBD5E1', fontSize: 13, fontWeight: 600 },
  toggle:   { fontSize: 9, color: '#64748B', width: 12 },
  rackRow:  { padding: '5px 16px 5px 36px', fontSize: 13, cursor: 'pointer', borderRadius: 4, color: '#64748B', display: 'block', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  addBtn:   { display: 'block', padding: '3px 16px 3px 36px', fontSize: 12, color: '#3BB2F6', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' },
}

type Props = { site: Site; racks: Rack[]; onAddRack: () => void }

export default function RackTree({ site, racks, onAddRack }: Props) {
  const [open, setOpen] = useState(true)
  const { rackId: activeRackId } = useParams()
  const navigate = useNavigate()
  const { isPatching, isManualSplitView, setCrossSiteTargetRackId } = usePatching()

  const handleRackClick = (e: React.MouseEvent, rackId: string) => {
    if (isPatching || isManualSplitView) {
      if (rackId !== activeRackId) {
        setCrossSiteTargetRackId(rackId)
      }
      e.preventDefault()
    } else {
      setCrossSiteTargetRackId(null)
      navigate(`/racks/${rackId}`)
    }
  }

  return (
    <div>
      <div style={s.siteRow} onClick={() => setOpen(o => !o)}>
        <span style={s.toggle}>{open ? '▼' : '▶'}</span>
        <span>📍 {site.name}</span>
      </div>
      {open && (
        <>
          <div
            onClick={() => navigate(`/sites/${site.id}`)}
            style={{
              ...s.rackRow,
              background: window.location.pathname === `/sites/${site.id}` ? '#1f2937' : 'transparent',
              color: window.location.pathname === `/sites/${site.id}` ? '#3BB2F6' : '#64748B',
            }}
          >
            🕸️ Topology
          </div>
          {racks.map(rack => (
            <div
              key={rack.id}
              onClick={(e) => handleRackClick(e, rack.id)}
              style={{
                ...s.rackRow,
                background: rack.id === activeRackId ? '#1f2937' : 'transparent',
                color: rack.id === activeRackId ? '#3BB2F6' : '#64748B',
              }}
            >
              🗄 {rack.name}
            </div>
          ))}
          <button style={s.addBtn} onClick={onAddRack}>+ rack</button>
        </>
      )}
    </div>
  )
}
