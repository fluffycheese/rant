import { useState, useEffect } from 'react'

export function DemoBanner() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!window.appConfig?.demoMode) return

    const updateTimer = () => {
      const now = new Date()
      // Find next 00:00 or 12:00 UTC
      const next = new Date(now)
      next.setUTCMinutes(0, 0, 0)
      if (now.getUTCHours() < 12) {
        next.setUTCHours(12)
      } else {
        next.setUTCHours(24) // Rolls over to next day 00:00
      }
      
      const diffMs = next.getTime() - now.getTime()
      const h = Math.floor(diffMs / (1000 * 60 * 60))
      const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diffMs % (1000 * 60)) / 1000)
      
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const int = setInterval(updateTimer, 1000)
    return () => clearInterval(int)
  }, [])

  if (!window.appConfig?.demoMode) return null

  return (
    <div style={{
      background: '#eab308',
      color: '#422006',
      padding: '8px 16px',
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 600,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      zIndex: 1000,
    }}>
      <span>🧪 RANT Public Demo Instance</span>
      <span style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: 13 }}>
        Resets in {timeLeft}
      </span>
    </div>
  )
}
