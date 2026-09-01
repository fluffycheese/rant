import { useEffect, useState } from 'react'
import { api, type User } from '../api/client.ts'
import { useAuth } from '../auth/AuthContext.tsx'

export default function AdminPage() {
  const { proxyAuth } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const load = () => api.users.list().then(setUsers).catch(console.error)

  useEffect(() => {
    if (!proxyAuth) load()
  }, [proxyAuth])

  if (proxyAuth) {
    return (
      <div style={{ padding: 40, color: '#64748B', textAlign: 'center' }}>
        <h2 style={{ color: '#F1F5F9' }}>Admin Disabled</h2>
        <p>Built-in user management is disabled because <code>PROXY_AUTH=true</code> is set.</p>
        <p>Please manage users via your reverse proxy or identity provider.</p>
      </div>
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.users.create({ username, password })
      setUsername('')
      setPassword('')
      load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handlePasswordChange = async (id: string, name: string) => {
    const newPassword = prompt(`Enter new password for "${name}":`)
    if (newPassword === null) return
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    try {
      await api.users.changePassword(id, newPassword)
      alert(`Password updated for user "${name}"`)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"?`)) return
    try {
      await api.users.delete(id)
      load()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const s = {
    page: { padding: 32, maxWidth: 600, margin: '0 auto' },
    title: { fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 24 },
    card: { background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: 20, marginBottom: 24 },
    input: { width: '100%', background: '#0F172A', color: '#F1F5F9', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', fontSize: 14, marginBottom: 12 },
    btn: { background: '#10B981', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #334155' },
    delBtn: { background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: 13, padding: '4px 8px' },
    pwBtn: { background: 'none', border: 'none', color: '#3BB2F6', cursor: 'pointer', fontSize: 13, padding: '4px 8px' },
  }

  return (
    <div style={s.page}>
      <div style={s.title}>Admin / Users</div>

      <div style={s.card}>
        <h3 style={{ marginTop: 0, marginBottom: 16, color: '#CBD5E1', fontSize: 16 }}>Add User</h3>
        <form onSubmit={handleCreate}>
          <input
            style={s.input}
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            style={s.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <div style={{ color: '#F87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button type="submit" style={s.btn} disabled={!username || !password}>
            Create User
          </button>
        </form>
      </div>

      <div style={s.card}>
        <h3 style={{ marginTop: 0, marginBottom: 16, color: '#CBD5E1', fontSize: 16 }}>Existing Users</h3>
        {users.map(u => (
          <div key={u.id} style={s.row}>
            <span style={{ color: '#F1F5F9', fontWeight: 600 }}>{u.username}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.pwBtn} onClick={() => handlePasswordChange(u.id, u.username)}>Change Password</button>
              <button style={s.delBtn} onClick={() => handleDelete(u.id, u.username)}>Delete</button>
            </div>
          </div>
        ))}
        {users.length === 0 && <div style={{ color: '#64748B', fontSize: 13 }}>No users found.</div>}
      </div>
    </div>
  )
}
