import React, { createContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const API = '/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const s = sessionStorage.getItem('solarsur_user')
    if (s) setUser(JSON.parse(s))
  }, [])

  const login = async ({ username, password }) => {
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (!response.ok) {
        return { ok: false, message: data.message }
      }

      sessionStorage.setItem('solarsur_token', data.token)
      sessionStorage.setItem('solarsur_user', JSON.stringify(data.user))

      setUser(data.user)
      return { ok: true }

    } catch (error) {
      console.error(error)
      return { ok: false, message: 'Error de conexión con el servidor' }
    }
  }

  const logout = async () => {
    // Intentar registrar logout en auditoría
    try {
      const token = sessionStorage.getItem('solarsur_token') || ''
      if (token) {
        await fetch(`${API}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
      }
    } catch (_) {}

    setUser(null)
    sessionStorage.removeItem('solarsur_user')
    sessionStorage.removeItem('solarsur_token')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
