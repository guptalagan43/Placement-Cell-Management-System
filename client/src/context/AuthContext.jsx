// AuthContext: holds the current user and access token in memory.
// Access token is NOT persisted to localStorage/sessionStorage (rules.md §3).
// Refresh token lives in httpOnly cookie managed by the server.
import { createContext, useContext, useState, useCallback } from 'react'
import { login as loginApi, logout as logoutApi } from '../api/auth.api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  // Start with loading=false since we don't have a /auth/me endpoint yet.
  // When one is added, initialize to true and fetch on mount.
  const [loading] = useState(false)

  const login = useCallback(async (email, password) => {
    const data = await loginApi(email, password)
    setAccessToken(data.accessToken)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(async () => {
    await logoutApi()
    setAccessToken(null)
    setUser(null)
  }, [])

  const value = {
    user,
    accessToken,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

export default AuthContext
