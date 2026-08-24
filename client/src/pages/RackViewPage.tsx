import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type RackViewPayload, type DeviceTemplate } from '../api/client.ts'
import RackView from '../components/RackView/RackView.tsx'
import { usePatching } from '../contexts/PatchingContext.tsx'

export default function RackViewPage() {
  const { rackId } = useParams<{ rackId: string }>()
  const { crossSiteTargetRackId, isManualSplitView } = usePatching()
  const navigate = useNavigate()
  
  const [payload, setPayload] = useState<RackViewPayload | null>(null)
  const [targetPayload, setTargetPayload] = useState<RackViewPayload | null>(null)
  const [templates, setTemplates] = useState<DeviceTemplate[]>([])
  
  const [loading, setLoading] = useState(false)
  const [targetLoading, setTargetLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!rackId) return
    setLoading(true)
    setError(null)
    try {
      const [p, t] = await Promise.all([
        api.racks.view(rackId),
        api.templates.list(),
      ])
      setPayload(p)
      setTemplates(t)
    } catch (e: any) {
      setError(e.message || 'Failed to load rack details')
    } finally {
      setLoading(false)
    }
  }, [rackId])

  useEffect(() => {
    load()
  }, [load])

  const loadTarget = useCallback(async () => {
    if (!crossSiteTargetRackId) return
    setTargetLoading(true)
    try {
      const p = await api.racks.view(crossSiteTargetRackId)
      setTargetPayload(p)
    } catch (e: any) {
      console.error('Failed to load target rack', e)
    } finally {
      setTargetLoading(false)
    }
  }, [crossSiteTargetRackId])

  useEffect(() => {
    if (!crossSiteTargetRackId) {
      setTargetPayload(null)
      return
    }
    loadTarget()
  }, [crossSiteTargetRackId, loadTarget])

  if (!rackId) return null

  if (loading && !payload) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8b949e', fontSize: 14 }}>
        Loading rack…
      </div>
    )
  }

  if (error && !payload) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div style={{ color: '#ff7b72', fontSize: 14 }}>Error: {error}</div>
        <button
          type="button"
          onClick={load}
          style={{ background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    )
  }

  if (!payload) return null

  const handleReloadBoth = () => {
    load()
    if (crossSiteTargetRackId) {
      loadTarget()
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <div style={{ flex: 1, borderRight: (targetPayload || isManualSplitView) ? '1px solid #30363d' : 'none', overflow: 'hidden' }}>
        <RackView
          payload={payload}
          templates={templates}
          onReload={handleReloadBoth}
        />
      </div>
      {targetPayload ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <RackView
            payload={targetPayload}
            templates={templates}
            onReload={handleReloadBoth}
            isSecondaryView={true}
            onMakePrimary={() => navigate(`/racks/${targetPayload.rack.id}`)}
          />
        </div>
      ) : isManualSplitView ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e', fontSize: 14 }}>
          Select a rack from the left menu to compare
        </div>
      ) : null}
    </div>
  )
}
