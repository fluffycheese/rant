import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { SelectedPortInfo } from '../components/RackView/DeviceCard.tsx'

type PatchingContextType = {
  isPatching: boolean
  selectedPort: SelectedPortInfo | null
  setSelectedPort: (port: SelectedPortInfo | null) => void
  crossSiteTargetRackId: string | null
  setCrossSiteTargetRackId: (id: string | null) => void
  isManualSplitView: boolean
  setIsManualSplitView: (val: boolean) => void
  highlightedLinkId: string | null
  setHighlightedLinkId: (id: string | null) => void
}

const PatchingContext = createContext<PatchingContextType | null>(null)

export function PatchingProvider({ children }: { children: ReactNode }) {
  const [selectedPort, setSelectedPort] = useState<SelectedPortInfo | null>(null)
  const [crossSiteTargetRackId, setCrossSiteTargetRackId] = useState<string | null>(null)
  const [isManualSplitView, setIsManualSplitView] = useState(false)
  const [highlightedLinkId, setHighlightedLinkId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedPort && crossSiteTargetRackId && !isManualSplitView) {
      setCrossSiteTargetRackId(null)
    }
  }, [selectedPort, crossSiteTargetRackId, isManualSplitView])

  return (
    <PatchingContext.Provider value={{
      isPatching: !!selectedPort,
      selectedPort,
      setSelectedPort,
      crossSiteTargetRackId,
      setCrossSiteTargetRackId,
      isManualSplitView,
      setIsManualSplitView,
      highlightedLinkId,
      setHighlightedLinkId
    }}>
      {children}
    </PatchingContext.Provider>
  )
}

export function usePatching() {
  const ctx = useContext(PatchingContext)
  if (!ctx) throw new Error('usePatching must be used within PatchingProvider')
  return ctx
}
