import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client.ts'
import TopologyView, { type LinkData } from '../components/TopologyView.tsx'

export default function ProfileViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [links, setLinks] = useState<LinkData[]>([])
  const [mermaidData, setMermaidData] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        let profileId = id
        if (!profileId) {
          const profiles = await api.profiles.list()
          if (profiles.length > 0) {
            profileId = profiles[0].id
          } else {
            setLoading(false)
            return
          }
        }
        
        const [linksData, topology] = await Promise.all([
          api.profiles.crossSiteLinks(profileId),
          api.profiles.topology(profileId)
        ])
        
        setLinks(linksData)
        setMermaidData(topology.mermaidData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <div style={{ padding: 24, color: '#CBD5E1' }}>Loading...</div>

  return <TopologyView title="Global Topology (Cross-Site Links)" mermaidData={mermaidData} links={links} />
}
