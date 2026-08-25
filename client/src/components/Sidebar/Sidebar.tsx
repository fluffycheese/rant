import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Profile, type Site, type Rack } from '../../api/client.ts'
import { useAuth } from '../../auth/AuthContext.tsx'
import RackTree from './RackTree.tsx'
import RackFormModal from '../RackFormModal.tsx'

const s: Record<string, CSSProperties> = {
  sidebar:    { width: 260, background: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' },
  header:     { padding: '14px 16px', borderBottom: '1px solid #30363d', fontSize: 15, fontWeight: 700, color: '#58a6ff', letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  section:    { padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 0.8 },
  scroll:     { flex: 1, overflowY: 'auto' },
  footer:     { padding: '10px 16px', borderTop: '1px solid #30363d', display: 'flex', flexDirection: 'column', gap: 8 },
  footerLink: { color: '#8b949e', fontSize: 12, textDecoration: 'none', display: 'block', padding: '2px 0' },
  userRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#c9d1d9', paddingTop: 6, borderTop: '1px solid #21262d' },
  logoutBtn:  { background: 'none', border: 'none', color: '#ff7b72', cursor: 'pointer', fontSize: 11, padding: '2px 4px', borderRadius: 4 },
  select:     { width: '100%', background: '#0d1117', color: '#e2e8f0', border: '1px solid #30363d', borderRadius: 6, padding: '6px 8px', fontSize: 13, marginTop: 4 },
  addBtn:     { background: 'none', border: '1px dashed #30363d', color: '#8b949e', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', width: '100%', marginTop: 8 },
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [profiles, setProfiles]                 = useState<Profile[]>([])
  const [activeProfileId, setActiveProfileId]   = useState<string | null>(null)
  const [sites, setSites]                       = useState<Site[]>([])
  const [racksBySite, setRacksBySite]           = useState<Record<string, Rack[]>>({})
  const [rackModalSiteId, setRackModalSiteId]   = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.profiles.list().then(async ps => {
      if (ps.length > 0) {
        setProfiles(ps)
        setActiveProfileId(ps[0].id)
      } else {
        const p = await api.profiles.create({ name: 'Default Profile' })
        setProfiles([p])
        setActiveProfileId(p.id)
      }
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!activeProfileId) return
    api.profiles.sites(activeProfileId).then(setSites).catch(console.error)
  }, [activeProfileId])

  useEffect(() => {
    if (sites.length === 0) {
      setRacksBySite({})
      return
    }
    Promise.all(sites.map(site => api.sites.racks(site.id).then(racks => ({ siteId: site.id, racks }))))
      .then(results => {
        const map: Record<string, Rack[]> = {}
        for (const { siteId, racks } of results) map[siteId] = racks
        setRacksBySite(map)
      })
      .catch(console.error)
  }, [sites])

  const handleAddProfile = async () => {
    const name = prompt('New profile name:')
    if (!name) return
    const p = await api.profiles.create({ name })
    setProfiles(prev => [...prev, p])
    setActiveProfileId(p.id)
  }

  const handleAddSite = async () => {
    if (!activeProfileId) return
    const name = prompt('New site name:')
    if (!name) return
    const s = await api.sites.create({ profileId: activeProfileId, name })
    setSites(prev => [...prev, s])
  }

  const handleAddRack = async (name: string, description: string, uHeight: number) => {
    if (!rackModalSiteId) return
    const siteId = rackModalSiteId
    const r = await api.racks.create({ siteId, name, description: description || undefined, uHeight })
    setRacksBySite(prev => ({ ...prev, [siteId]: [...(prev[siteId] ?? []), r] }))
    setRackModalSiteId(null)
    navigate(`/racks/${r.id}`)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside style={s.sidebar}>
      <div style={s.header}>
        <span>RANT</span>
      </div>



      <div style={s.scroll}>
        {sites.map(site => (
          <RackTree
            key={site.id}
            site={site}
            racks={racksBySite[site.id] ?? []}
            onAddRack={() => setRackModalSiteId(site.id)}
          />
        ))}
        {activeProfileId && (
          <div style={{ padding: '4px 16px 8px' }}>
            <button style={s.addBtn} onClick={handleAddSite}>+ New site</button>
          </div>
        )}
      </div>

      <div style={s.footer}>
        <Link to={activeProfileId ? `/profiles/${activeProfileId}` : '/topology'} style={s.footerLink}>🌍 Global Topology</Link>
        <Link to="/templates" style={s.footerLink}>⚙ Device Templates</Link>
        <Link to="/admin" style={s.footerLink}>👥 Users (Admin)</Link>

        {user && (
          <div style={s.userRow}>
            <span>👤 {user.username}</span>
            <button type="button" style={s.logoutBtn} onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </div>

      {rackModalSiteId && (
        <RackFormModal
          mode="create"
          onConfirm={handleAddRack}
          onCancel={() => setRackModalSiteId(null)}
        />
      )}
    </aside>
  )
}

