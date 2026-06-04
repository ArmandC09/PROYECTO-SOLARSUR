import React, { useState, useContext, useEffect } from 'react'
import Header from './components/Header'
import HomeDashboard from './components/HomeDashboard'
import CompanyProfile from './components/CompanyProfile'
import Providers from './components/Providers'
import Sales from './components/Sales'
import Quotes from './components/Quotes'
import Inventory from './components/Inventory'
import Clients from './components/Clients'
import SalesHistory from './components/SalesHistory'
import Users from './components/Users'
import Movements from './components/Movements'
import AuditLog from './components/AuditLog'
import Kits from './components/Kits'
import Footer from './components/Footer'
import Login from './components/Login'
import AuthContext from './context/AuthContext'
import AppContext from './context/AppContext'

export default function App() {
  const [section, setSection] = useState('home')
  const { user } = useContext(AuthContext)
  const { loadAll } = useContext(AppContext)

  // Cargar datos cuando el usuario ya está autenticado (token ya en sessionStorage)
  useEffect(() => {
    if (user) loadAll()
  }, [user])

  // Recargar datos cada vez que el usuario cambia de módulo
  const handleNavigate = (newSection) => {
    setSection(newSection)
    if (user) loadAll()
  }

  if (!user) return <Login />

  const isSuperAdmin = user?.role === 'SUPERADMIN'
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin
  const isWarehouse = user?.role === 'WAREHOUSE'
  const isSales = user?.role === 'SALES'

  return (
    <div className={`app ${section !== 'home' ? 'with-topbar' : ''}`}>
      <Header onNavigate={handleNavigate} currentView={section} />

      <main className={section === 'home' ? 'home-main' : ''}>
        {section === 'home' && <HomeDashboard onNavigate={handleNavigate} />}
        {section === 'profile' && isAdmin && <CompanyProfile />}
        {section === 'providers' && (isAdmin || isWarehouse) && <Providers />}
        {section === 'sales' && (isAdmin || isSales) && <Sales />}
        {section === 'quotes' && (isAdmin || isSales) && <Quotes />}
        {section === 'inventory' && <Inventory />}
        {section === 'kits' && <Kits />}
        {section === 'clients' && <Clients />}
        {section === 'history' && (isAdmin || isSales) && <SalesHistory />}
        {section === 'users' && isSuperAdmin && <Users />}
        {section === 'movements' && (isAdmin || isWarehouse) && <Movements />}
        {section === 'audit' && isSuperAdmin && <AuditLog />}
      </main>

      <Footer />
    </div>
  )
}
