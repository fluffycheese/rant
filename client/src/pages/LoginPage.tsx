import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.tsx'
import { api } from '../api/client.ts'

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'

  useEffect(() => {
    api.auth.setupStatus()
      .then(res => setNeedsSetup(res.needsSetup))
      .catch(() => setNeedsSetup(false))
  }, [])

  if (!isLoading && isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return

    setSubmitting(true)
    setError(null)

    try {
      if (needsSetup) {
        await api.auth.setup(username.trim(), password)
      }
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.message || (needsSetup ? 'Setup failed.' : 'Login failed. Please check your credentials.'))
    } finally {
      setSubmitting(false)
    }
  }

  const s: Record<string, React.CSSProperties> = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1117',
      padding: 16,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    card: {
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: 12,
      padding: '36px 32px',
      width: '100%',
      maxWidth: 400,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    },
    header: {
      textAlign: 'center',
    },
    logo: {
      fontSize: 24,
      fontWeight: 800,
      color: '#58a6ff',
      letterSpacing: 1,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13,
      color: '#8b949e',
    },
    errorAlert: {
      background: 'rgba(248, 81, 73, 0.15)',
      border: '1px solid #f85149',
      color: '#ff7b72',
      borderRadius: 6,
      padding: '10px 12px',
      fontSize: 13,
    },
    field: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    },
    label: {
      fontSize: 12,
      fontWeight: 600,
      color: '#c9d1d9',
    },
    input: {
      width: '100%',
      background: '#0d1117',
      color: '#e2e8f0',
      border: '1px solid #30363d',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 14,
      outline: 'none',
      boxSizing: 'border-box',
    },
    button: {
      background: '#238636',
      color: '#ffffff',
      border: 'none',
      borderRadius: 6,
      padding: '10px 16px',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      width: '100%',
      marginTop: 6,
      opacity: submitting || !username.trim() || !password ? 0.6 : 1,
      transition: 'background-color 0.2s',
    },
  }

  if (needsSetup === null) return null

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.logo}>RANT</div>
          <div style={s.subtitle}>
            {needsSetup ? 'Create first admin user' : 'Rack And Networking Tool'}
          </div>
        </div>

        {error && <div style={s.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={s.field}>
            <label style={s.label} htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              style={s.input}
              required
            />
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="password">Password {needsSetup && '(min 6 chars)'}</label>
            <input
              id="password"
              type="password"
              autoComplete={needsSetup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={s.input}
              required
              minLength={needsSetup ? 6 : undefined}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !username.trim() || !password}
            style={s.button}
          >
            {submitting 
              ? (needsSetup ? 'Creating…' : 'Signing in…') 
              : (needsSetup ? 'Create Admin' : 'Sign in')}
          </button>
        </form>
      </div>
    </div>
  )
}
