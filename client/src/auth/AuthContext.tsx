import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type User } from '../api/client.ts'

type AuthContextType = {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  proxyAuth: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [proxyAuth, setProxyAuth] = useState(false)

  useEffect(() => {
    let mounted = true
    api.auth.me()
      .then(res => {
        if (mounted) {
          if (res.authenticated && res.user) {
            setUser(res.user)
          } else {
            setUser(null)
          }
          if (res.proxyAuth) {
            setProxyAuth(true)
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null)
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const login = async (username: string, password: string) => {
    const res = await api.auth.login(username, password)
    if (res.ok && res.user) {
      setUser(res.user)
    }
  }

  const logout = async () => {
    try {
      await api.auth.logout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        proxyAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
