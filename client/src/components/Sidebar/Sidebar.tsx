import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { api, type Profile, type Site, type Rack } from '../../api/client.ts'
import { useAuth } from '../../auth/AuthContext.tsx'
import RackTree from './RackTree.tsx'
import RackFormModal from '../RackFormModal.tsx'

// ---------------------------------------------------------------------------
// Collapsed rail width / expanded width
// ---------------------------------------------------------------------------
const EXPANDED_W = 260
const RAIL_W = 56

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed]               = useState(false)
  const [profiles, setProfiles]                 = useState<Profile[]>([])
  const [activeProfileId, setActiveProfileId]   = useState<string | null>(null)
  const [sites, setSites]                       = useState<Site[]>([])
  const [racksBySite, setRacksBySite]           = useState<Record<string, Rack[]>>({})
  const [rackModalSiteId, setRackModalSiteId]   = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

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

  // Shared style tokens
  const border = '1px solid #334155'
  const mutedColor = '#64748B'
  const textColor = '#F1F5F9'

  // ---------------------------------------------------------------------------
  // COLLAPSED RAIL
  // ---------------------------------------------------------------------------
  if (collapsed) {
    const railItem: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      padding: '8px 0',
      cursor: 'pointer',
      color: mutedColor,
      fontSize: 18,
      textDecoration: 'none',
      border: 'none',
      background: 'none',
    }
    return (
      <aside style={{
        width: RAIL_W,
        background: '#1E293B',
        borderRight: border,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 0.2s ease',
      }}>
        {/* Logo icon */}
        <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'center', borderBottom: border, background: '#64748B' }}>
          <img src="/icon.png" alt="RANT" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          style={{ ...railItem, borderBottom: border, fontSize: 16, color: mutedColor }}
        >
          ›
        </button>

        {/* Site initials */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {sites.map(site => {
            const initials = site.name.slice(0, 2).toUpperCase()
            const racks = racksBySite[site.id] ?? []
            const isActive = racks.some(r => location.pathname === `/racks/${r.id}`)
            return (
              <div key={site.id} title={site.name} style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: isActive ? '#0EA5E9' : '#334155',
                    color: isActive ? '#fff' : '#CBD5E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'default',
                  }}
                >
                  {initials}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer icons */}
        <div style={{ borderTop: border, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', gap: 4 }}>
          <Link to={activeProfileId ? `/profiles/${activeProfileId}` : '/topology'} title="Global Topology" style={railItem}>🌍</Link>
          <Link to="/templates" title="Device Templates" style={railItem}>⚙</Link>
          <Link to="/admin" title="Users (Admin)" style={railItem}>👥</Link>
          {user && (
            <button type="button" title={`Log out ${user.username}`} style={railItem} onClick={handleLogout}>
              👤
            </button>
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

  // ---------------------------------------------------------------------------
  // EXPANDED SIDEBAR
  // ---------------------------------------------------------------------------
  const s: Record<string, CSSProperties> = {
    sidebar:    { width: EXPANDED_W, background: '#1E293B', borderRight: border, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', transition: 'width 0.2s ease' },
    header:     { padding: '16px 12px', borderBottom: border, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, background: '#64748B', position: 'relative' as const },
    collapseBtn:{ background: 'none', border: 'none', color: '#0F172A', cursor: 'pointer', fontSize: 18, padding: '4px 6px', borderRadius: 4, lineHeight: 1, flexShrink: 0, position: 'absolute' as const, top: 8, right: 8 },
    section:    { padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.8 },
    scroll:     { flex: 1, overflowY: 'auto' },
    footer:     { padding: '10px 16px', borderTop: border, display: 'flex', flexDirection: 'column', gap: 8 },
    footerLink: { color: mutedColor, fontSize: 12, textDecoration: 'none', display: 'block', padding: '2px 0' },
    userRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#CBD5E1', paddingTop: 6, borderTop: '1px solid #334155' },
    logoutBtn:  { background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: 11, padding: '2px 4px', borderRadius: 4 },
    addBtn:     { background: 'none', border: '1px dashed #334155', color: mutedColor, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', width: '100%', marginTop: 8 },
  }

  return (
    <aside style={s.sidebar}>
      {/* Logo + collapse toggle */}
      <div style={s.header}>
        <img
          src="/primary-stacked.png"
          alt="RANT"
          style={{ height: 140, objectFit: 'contain' }}
        />
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Collapse sidebar"
          style={s.collapseBtn}
        >
          ‹
        </button>
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
