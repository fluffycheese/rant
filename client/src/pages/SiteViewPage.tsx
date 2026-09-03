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

  return <TopologyView title={title} mermaidData={mermaidData} links={links} siteId={site?.id} isProtected={site?.isProtected} />
}
