// AuthContext: holds the current user and access token in memory.
// Access token is NOT persisted to localStorage/sessionStorage (rules.md §3).
// Refresh token lives in httpOnly cookie managed by the server.
import { createContext, useContext, useState, useCallback } from 'react'
import { logout as logoutApi } from '../api/auth.api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [loading] = useState(false)

  // Called by LoginPage step 2 (after OTP verified) with the token + user from the server
  const loginWithToken = useCallback((token, userData) => {
    setAccessToken(token)
    setUser(userData)
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
    loginWithToken,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export default AuthContext
