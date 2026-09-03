import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { api, type Stats } from '../api/client.ts'

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.stats.get()
      setStats(data)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const s: Record<string, CSSProperties> = {
    page: {
      padding: '36px 40px',
      maxWidth: 1200,
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 32,
      flexWrap: 'wrap',
      gap: 16,
    },
    title: {
      fontSize: 26,
      fontWeight: 700,
      color: '#F1F5F9',
      margin: 0,
      letterSpacing: '-0.02em',
    },
    subtitle: {
      fontSize: 14,
      color: '#64748B',
      marginTop: 6,
      marginBottom: 0,
    },
    refreshBtn: {
      background: '#1E293B',
      border: '1px solid #334155',
      borderRadius: 6,
      color: '#CBD5E1',
      padding: '8px 16px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      transition: 'border-color 0.15s ease',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 20,
      marginBottom: 36,
    },
    card: {
      background: '#1E293B',
      border: '1px solid #334155',
      borderRadius: 8,
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      position: 'relative',
      minHeight: 148,
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: 700,
      color: '#64748B',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    cardIcon: {
      fontSize: 20,
      lineHeight: 1,
    },
    cardValue: {
      fontSize: 38,
      fontWeight: 700,
      color: '#F1F5F9',
      lineHeight: 1.1,
      marginBottom: 8,
    },
    cardDesc: {
      fontSize: 12,
      color: '#CBD5E1',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      margin: 0,
    },
    accentBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 700,
      color: '#CBD5E1',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 16,
    },
    quickLinksGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: 16,
    },
    quickLinkCard: {
      background: '#1E293B',
      border: '1px solid #334155',
      borderRadius: 8,
      padding: 20,
      textDecoration: 'none',
      color: 'inherit',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      boxSizing: 'border-box',
      transition: 'border-color 0.15s ease',
    },
    quickLinkTitle: {
      fontSize: 15,
      fontWeight: 600,
      color: '#3BB2F6',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    quickLinkDesc: {
      fontSize: 13,
      color: '#64748B',
      margin: 0,
      lineHeight: 1.4,
    },
    loadingBox: {
      padding: 60,
      textAlign: 'center',
      color: '#64748B',
      fontSize: 15,
    },
    errorBox: {
      background: '#2B1717',
      border: '1px solid #F87171',
      borderRadius: 8,
      padding: 20,
      color: '#F87171',
      marginBottom: 24,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  }

  const metricCards = stats
    ? [
        {
          label: 'Total Sites',
          value: stats.totalSites,
          icon: '🏢',
          desc: 'Managed physical locations',
          accent: '#3BB2F6',
        },
        {
          label: 'Total Racks',
          value: stats.totalRacks,
          icon: '🗄️',
          desc: 'Equipment rack enclosures',
          accent: '#0EA5E9',
        },
        {
          label: 'Total Devices',
          value: stats.totalDevices,
          icon: '🖥️',
          desc: 'Active network hardware & endpoints',
          accent: '#10B981',
        },
        {
          label: 'Total Connections',
          value: stats.totalConnections,
          icon: '🔌',
          desc: 'Active patch and cable links',
          accent: '#3BB2F6',
        },
        {
          label: 'Cross-Rack Links',
          value: stats.crossRackLinks,
          icon: '⇄',
          desc: 'Inter-rack connections',
          accent: '#38BDF8',
        },
        {
          label: 'Cross-Site Links',
          value: stats.crossSiteLinks,
          icon: '🌐',
          desc: 'Inter-site backbone links',
          accent: '#A78BFA',
        },
      ]
    : []

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Dashboard</h1>
          <p style={s.subtitle}>Overview of network infrastructure, racks, and patch connectivity</p>
        </div>
        <button
          type="button"
          style={s.refreshBtn}
          onClick={fetchStats}
          disabled={loading}
        >
          <span>↻</span> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={s.errorBox}>
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button
            type="button"
            style={{ ...s.refreshBtn, borderColor: '#F87171', color: '#F87171' }}
            onClick={fetchStats}
          >
            Retry
          </button>
        </div>
      )}

      {loading && !stats ? (
        <div style={s.loadingBox}>Loading dashboard metrics...</div>
      ) : (
        <>
          <div style={s.grid}>
            {metricCards.map((card) => (
              <div key={card.label} style={s.card}>
                <div style={{ ...s.accentBar, backgroundColor: card.accent }} />
                <div style={s.cardHeader}>
                  <span style={s.cardLabel}>{card.label}</span>
                  <span style={s.cardIcon}>{card.icon}</span>
                </div>
                <div style={s.cardValue}>{card.value}</div>
                <p style={s.cardDesc}>{card.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40 }}>
            <div style={s.sectionTitle}>Quick Navigation</div>
            <div style={s.quickLinksGrid}>
              <Link to="/topology" style={s.quickLinkCard}>
                <div style={s.quickLinkTitle}>
                  <span>🌍</span> Global Topology
                </div>
                <p style={s.quickLinkDesc}>
                  Visualize site-to-site connectivity and inter-facility links.
                </p>
              </Link>
              <Link to="/templates" style={s.quickLinkCard}>
                <div style={s.quickLinkTitle}>
                  <span>⚙</span> Device Templates
                </div>
                <p style={s.quickLinkDesc}>
                  Manage equipment templates, port layouts, and blueprints.
                </p>
              </Link>
              <Link to="/admin" style={s.quickLinkCard}>
                <div style={s.quickLinkTitle}>
                  <span>👥</span> User Administration
                </div>
                <p style={s.quickLinkDesc}>
                  Manage local user credentials and access controls.
                </p>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
