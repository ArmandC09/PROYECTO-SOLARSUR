import React, { useContext, useState } from 'react'
import AppContext from '../context/AppContext'
import AuthContext from '../context/AuthContext'

function IconBox({ img, letter, color }) {
  const [error, setError] = useState(false)
  return (
    <div className="dashboard-icon" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }}>
      {!img || error ? (
        <div className="fallback-icon">{letter}</div>
      ) : (
        <img src={img} alt="" onError={() => setError(true)} />
      )}
    </div>
  )
}

export default function HomeDashboard({ onNavigate }) {
  const { company } = useContext(AppContext)
  const { logout, user } = useContext(AuthContext)

  const isSuperAdmin = user?.role === 'SUPERADMIN'
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin
  const isWarehouse = user?.role === 'WAREHOUSE'
  const isSales = user?.role === 'SALES'

  const salesCards = [
    { key: 'sales', label: 'Venta', desc: 'Convertir cotizaciones', img: '/images/icon_sales.png', letter: 'V', color: '#10b981', action: () => onNavigate('sales'), show: !isWarehouse },
    { key: 'clients-sales', label: 'Clientes', desc: 'Gestión de clientes', img: '/images/icon_clients.png', letter: 'C', color: '#ec4899', action: () => onNavigate('clients'), show: !isWarehouse },
    { key: 'quotes', label: 'Cotización', desc: 'Generar cotizaciones', img: '/images/icon_quotes.png', letter: 'C', color: '#f59e0b', action: () => onNavigate('quotes'), show: !isWarehouse },
    { key: 'history', label: 'Historial', desc: 'Ventas realizadas', img: '/images/icon_history.png', letter: 'H', color: '#6b7280', action: () => onNavigate('history'), show: !isWarehouse && !isSales }
  ].filter((item) => item.show)

  const inventoryCards = [
    { key: 'inventory', label: 'Inventario', desc: 'Control de stock', img: '/images/icon_inventory.png', letter: 'I', color: '#8b5cf6', action: () => onNavigate('inventory'), show: true },
    { key: 'providers', label: 'Proveedores', desc: 'Gestión de proveedores', img: '/images/icon_providers.png', letter: 'P', color: '#0ea5e9', action: () => onNavigate('providers'), show: isAdmin },
    { key: 'movements', label: 'Almacén', desc: 'Entradas / Salidas', img: '/images/icon_warehouse.png', letter: 'A', color: '#22c55e', action: () => onNavigate('movements'), show: !isSales },
    { key: 'clients-warehouse', label: 'Clientes', desc: 'Ver clientes', img: '/images/icon_clients.png', letter: 'C', color: '#ec4899', action: () => onNavigate('clients'), show: isWarehouse }
  ].filter((item) => item.show)

  const configCards = [
    { key: 'users', label: 'Usuarios', desc: 'Cuentas y permisos', img: '/images/icon_users.png', letter: 'U', color: '#2563eb', action: () => onNavigate('users'), show: isSuperAdmin },
    { key: 'audit', label: 'Auditoría', desc: 'Registro de actividad', img: '/images/icon_audit.png', letter: 'A', color: '#7c3aed', action: () => onNavigate('audit'), show: isSuperAdmin },
    { key: 'profile', label: 'Perfil', desc: 'Datos de empresa', img: '/images/icon_profile.png', letter: 'P', color: '#3b82f6', action: () => onNavigate('profile'), show: isAdmin },
    { key: 'logout', label: 'Salir', desc: user?.name || user?.username, img: '/images/icon_logout.png', letter: 'S', color: '#ef4444', action: logout, show: true }
  ].filter((item) => item.show)

  const getRowClassName = (count) => `dashboard-row dashboard-row-count-${Math.min(Math.max(count, 1), 4)}`

  const renderCard = (item) => (
    <button
      key={item.key}
      className="dashboard-card-horizontal"
      onClick={item.action}
      style={{
        '--card-accent': item.color,
        '--card-accent-soft': `${item.color}1f`,
        '--card-accent-mid': `${item.color}38`,
        '--card-accent-strong': `${item.color}55`
      }}
    >
      <IconBox img={item.img} letter={item.letter} color={item.color} />
      <div><h3>{item.label}</h3><p>{item.desc}</p></div>
    </button>
  )

  return (
    <div className="dashboard-container fade-in">
      <div className="dashboard-header-panel">
        <div className="dashboard-header">
          <span className="dashboard-kicker">Panel principal</span>
          <h1>¡Bienvenido a {company?.name || 'SolarSur'}!</h1>
          <p>Selecciona una sección para empezar</p>
        </div>
      </div>

      <div className="dashboard-sections">

        {/* VENTAS */}
        {!isWarehouse && (
          <div className="dashboard-section dashboard-section-sales">
            <h4>VENTAS</h4>
            <div className={getRowClassName(salesCards.length)}>{salesCards.map(renderCard)}</div>
          </div>
        )}

        {/* INVENTARIO */}
        <div className="dashboard-section dashboard-section-inventory">
          <h4>INVENTARIO</h4>
          <div className={getRowClassName(inventoryCards.length)}>{inventoryCards.map(renderCard)}</div>
        </div>

        {/* CONFIGURACIÓN */}
        <div className="dashboard-section dashboard-section-config">
          <h4>CONFIGURACIÓN</h4>
          <div className={getRowClassName(configCards.length)}>{configCards.map(renderCard)}</div>
        </div>

      </div>
    </div>
  )
}
