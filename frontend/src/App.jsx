import React, { useState, useContext } from 'react'
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
import Footer from './components/Footer'
import Login from './components/Login'
import AuthContext from './context/AuthContext'

export default function App() {
  const [section, setSection] = useState('home')
  const { user } = useContext(AuthContext)

  if (!user) return <Login />

  const isSuperAdmin = user?.role === 'SUPERADMIN'
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin
  const isWarehouse = user?.role === 'WAREHOUSE'
  const isSales = user?.role === 'SALES'

  return (
    <div className={`app ${section !== 'home' ? 'with-topbar' : ''}`}>
      <Header onNavigate={setSection} currentView={section} />

      <main className={section === 'home' ? 'home-main' : ''}>
        {section === 'home' && <HomeDashboard onNavigate={setSection} />}
        {section === 'profile' && isAdmin && <CompanyProfile />}
        {section === 'providers' && isAdmin && <Providers />}
        {section === 'sales' && !isWarehouse && <Sales />}
        {section === 'quotes' && !isWarehouse && <Quotes />}
        {section === 'inventory' && <Inventory />}
        {section === 'clients' && <Clients />}
        {section === 'history' && !isWarehouse && <SalesHistory />}
        {section === 'users' && isSuperAdmin && <Users />}
        {section === 'movements' && !isSales && <Movements />}
        {section === 'audit' && isSuperAdmin && <AuditLog />}
      </main>

      <Footer />
    </div>
  )
}
