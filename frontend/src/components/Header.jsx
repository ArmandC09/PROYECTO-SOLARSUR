import React, { useContext, useEffect, useState } from 'react'
import AuthContext from '../context/AuthContext'
import AppContext from '../context/AppContext'

function NavIcon({ children }) {
  return <span className="topbar-icon">{children}</span>
}

export default function Header({ onNavigate, currentView }) {
  const { logout, user } = useContext(AuthContext)
  const { company } = useContext(AppContext)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)

  const logo = company?.logo || ''
  const role = user?.role
  const isSuperAdmin = role === 'SUPERADMIN'
  const isAdmin = role === 'ADMIN' || isSuperAdmin
  const isSales = role === 'SALES'
  const isWarehouse = role === 'WAREHOUSE'
  const isHome = currentView === 'home'

  const items = [
    { id: 'home', label: 'Inicio' },

    // Ventas: SUPERADMIN, ADMIN, SALES — NO WAREHOUSE
    ...(!isWarehouse ? [{ id: 'sales', label: 'Ventas' }] : []),

    // Clientes: todos
    { id: 'clients', label: 'Clientes' },

    // Proveedores: solo ADMIN y SUPERADMIN
    ...(isAdmin ? [{ id: 'providers', label: 'Proveedores' }] : []),

    // Inventario: todos
    { id: 'inventory', label: 'Inventario' },

    // Almacén/Movimientos: SUPERADMIN, ADMIN, WAREHOUSE — NO SALES
    ...(!isSales ? [{ id: 'movements', label: 'Almacén' }] : []),

    // Cotización: SUPERADMIN, ADMIN, SALES — NO WAREHOUSE
    ...(!isWarehouse ? [{ id: 'quotes', label: 'Cotización' }] : []),

    // Historial: SUPERADMIN, ADMIN, SALES — NO WAREHOUSE
    ...(!isWarehouse ? [{ id: 'history', label: 'Historial' }] : []),

    // Usuarios: SOLO SUPERADMIN
    ...(isSuperAdmin ? [{ id: 'users', label: 'Usuarios' }] : []),

    // Auditoría: SOLO SUPERADMIN
    ...(isSuperAdmin ? [{ id: 'audit', label: 'Auditoría' }] : []),

    // Perfil empresa: SUPERADMIN y ADMIN
    ...(isAdmin ? [{ id: 'profile', label: 'Perfil' }] : []),
  ]

  const hasCrowdedNav = items.length >= 8

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [currentView])

  useEffect(() => {
    setLogoError(false)
  }, [logo])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 860) {
        setMobileMenuOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleNavigate = (section) => {
    setMobileMenuOpen(false)
    onNavigate(section)
  }

  const handleLogout = () => {
    setMobileMenuOpen(false)
    logout()
  }

  return (
    <header className={`topbar-wrap ${isHome ? 'topbar-home-only' : ''}`}>
      <div className="topbar-brand">
        {logo && !logoError ? (
          <img src={logo} alt="logo" className="topbar-logo" onError={() => setLogoError(true)} />
        ) : (
          <div className="topbar-logo-text">SolarSur</div>
        )}
      </div>

      {!isHome && (
        <button
          type="button"
          className={`topbar-menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
          aria-label={mobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}

      {!isHome && (
        <>
          <div
            className={`topbar-mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden={!mobileMenuOpen}
          />

          <div className={`topbar-shell ${hasCrowdedNav ? 'topbar-shell-crowded' : ''} ${mobileMenuOpen ? 'open' : ''}`}>
            <nav className="topbar-nav">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`topbar-link ${currentView === item.id ? 'active' : ''}`}
                  onClick={() => handleNavigate(item.id)}
                >
                  <NavIcon>{item.icon}</NavIcon>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="topbar-userbox">
              <div className="topbar-avatar">
                {user?.name?.[0] || 'U'}
              </div>

              <div className="topbar-usertext">
                <strong>{user?.name}</strong>
                <span>{user?.role}</span>
              </div>

              <button className="topbar-logout" onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </button>
            </div>

          </div>
        </>
      )}
    </header>
  )
}
