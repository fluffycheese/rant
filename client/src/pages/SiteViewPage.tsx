import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, type Site } from '../api/client.ts'
import TopologyView, { type LinkData } from '../components/TopologyView.tsx'

export default function SiteViewPage() {
  const { siteId } = useParams()
  const [mermaidData, setMermaidData] = useState<string | null>(null)
  const [links, setLinks] = useState<LinkData[]>([])
  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!siteId) return
      setLoading(true)
      setError(null)
      try {
        const [siteData, topology] = await Promise.all([
          api.sites.get(siteId),
          api.sites.topology(siteId)
        ])
        setSite(siteData)
        setMermaidData(topology.mermaidData)
        setLinks((topology as any).links || [])
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Failed to load site topology')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [siteId])

  if (loading) return <div style={{ padding: 24, color: '#CBD5E1' }}>Loading topology...</div>
  if (error) return <div style={{ padding: 24, color: '#F87171' }}>{error}</div>

  const title = site ? `${site.name} - Topology` : 'Site Topology'

  const printAction = site ? (
    <button 
      onClick={() => window.open(`/print/site/${site.id}`, '_blank')}
      style={{ padding: '2px 8px', fontSize: '11px', background: 'none', border: '1px solid #334155', color: '#F1F5F9', borderRadius: '4px', cursor: 'pointer', marginLeft: '12px' }}
      title="Print port labels for endpoints at this site"
    >
      🖨️ Print Labels
    </button>
  ) : null;

  return <TopologyView title={title} mermaidData={mermaidData} links={links} siteId={site?.id} isProtected={site?.isProtected} headerAction={printAction} />
}
