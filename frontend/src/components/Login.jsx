import React, { useState, useContext } from 'react'
import AuthContext from '../context/AuthContext'
import AppContext from '../context/AppContext'

export default function Login() {
  const { login } = useContext(AuthContext)
  const { company } = useContext(AppContext)
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    const res = await login(form)

    if (!res.ok) {
      setError(res.message || 'Credenciales inválidas')
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card fade-in">
        <div className="login-side">
          <div className="brand-block">
            {company?.logo ? <img src={company.logo} alt="logo" className="brand-logo" /> : <div className="brand-text">SolarSur</div>}
            <h2>Bienvenido</h2>
            <p className="small">Sistema de gestión SolarSur — ventas, cotizaciones e inventario</p>
            
            {/* Texto adicional sutil */}
            <div className="login-extra-text">
              <p>Gestiona tu negocio de forma eficiente y profesional</p>
              <div className="login-features">
                <span>✓ Ventas</span>
                <span>✓ Cotizaciones</span>
                <span>✓ Inventario</span>
              </div>
            </div>
          </div>
        </div>

        <form className="login-form" onSubmit={submit}>
          <h3 style={{ marginBottom: 6 }}>Iniciar sesión</h3>
          <div className="small muted" style={{ marginBottom: 30, fontSize: '11pt' }}>Introduce tus credenciales</div>
          {error && <div className="error" role="alert">{error}</div>}

          <label>Usuario
            <input className="login-input" placeholder="usuario" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </label>

          <label style={{ marginTop: 15 }}>Contraseña
            <input className="login-input" type="password" placeholder="contraseña" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>

          <div style={{ marginTop: 15 }}>
            <button type="submit">Entrar</button>
          </div>
        </form>
      </div>
    </div>
  )
}