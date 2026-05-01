import React, { createContext, useState, useEffect } from 'react'

const AppContext = createContext(null)
const API = '/api'

function getToken() {
  return sessionStorage.getItem('solarsur_token') || ''
}

async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API}${path}`
  const token = getToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}

export { apiFetch }

function filterConvertedQuotes(quotesData, salesData) {
  const convertedIds = new Set((salesData || []).map((sale) => sale.source_quote_id).filter(Boolean))
  const hiddenConvertedIds = getHiddenConvertedQuoteIds()
  hiddenConvertedIds.forEach((id) => convertedIds.add(id))
  return (quotesData || []).filter((quote) => !convertedIds.has(quote.id))
}

function getHiddenConvertedQuoteIds() {
  try {
    const raw = sessionStorage.getItem('solarsur_hidden_converted_quotes')
    if (!raw) return new Set()

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()

    return new Set(parsed.map((id) => Number(id)).filter(Boolean))
  } catch {
    return new Set()
  }
}

function rememberConvertedQuoteId(quoteId) {
  if (!quoteId) return

  const ids = getHiddenConvertedQuoteIds()
  ids.add(Number(quoteId))
  sessionStorage.setItem('solarsur_hidden_converted_quotes', JSON.stringify([...ids]))
}

export function AppProvider({ children }) {
  const [clients,   setClients]   = useState([])
  const [quotes,    setQuotes]    = useState([])
  const [inventory, setInventory] = useState([])
  const [sales,     setSales]     = useState([])
  const [providers, setProviders] = useState([])
  const [company,   setCompany]   = useState(null)
  const [users,     setUsers]     = useState([])
  const [movements, setMovements] = useState([])

  // Cargar datos públicos de la empresa al arrancar (sin token),
  // para que el logo aparezca en el Login desde el primer momento.
  useEffect(() => {
    fetch(`${API}/company`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.name) setCompany(data) })
      .catch(() => {})
  }, [])

  // loadAll se llama desde App.jsx cuando el usuario ya está autenticado
  // Esto evita requests sin token al montar la app

  const loadAll = async () => {
    try {
      const [cR, iR, pR, qR, sR, coR] = await Promise.all([
        apiFetch('/clients'), apiFetch('/inventory'), apiFetch('/providers'),
        apiFetch('/quotes'),  apiFetch('/sales'),     apiFetch('/company')
      ])
      if (cR.ok)  setClients(await cR.json())
      if (iR.ok)  setInventory(await iR.json())
      if (pR.ok)  setProviders(await pR.json())
      if (coR.ok) setCompany(await coR.json())

      const salesData  = sR.ok  ? await sR.json()  : []
      const quotesData = qR.ok  ? await qR.json()  : []
      setSales(salesData)
      setQuotes(filterConvertedQuotes(quotesData, salesData))
    } catch (e) { console.error('loadAll error:', e) }
  }

  // USERS
  const loadUsers = async () => {
    const r = await apiFetch('/users'); if (r.ok) setUsers(await r.json())
  }
  const createUser = async (u) => {
    const r = await apiFetch('/users', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(u) })
    const d = await r.json(); if (r.ok) setUsers(p => [d,...p]); return r.ok
  }
  const updateUser = async (id, u) => {
    const r = await apiFetch(`/users/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(u) })
    if (r.ok) setUsers(p => p.map(x => x.id===id ? {...x,...u} : x)); return r.ok
  }
  const toggleUserActive = async (id, is_active) => {
    const r = await apiFetch(`/users/${id}/active`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({is_active}) })
    if (r.ok) setUsers(p => p.map(x => x.id===id ? {...x,is_active} : x)); return r.ok
  }
  const resetUserPassword = async (id, password) => {
    const r = await apiFetch(`/users/${id}/password`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password}) })
    return r.ok
  }

  // MOVEMENTS
  const loadMovements = async () => {
    const r = await apiFetch('/movements'); if (r.ok) setMovements(await r.json())
  }
  const createMovement = async (m) => {
    const r = await apiFetch('/movements', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(m) })
    const d = await r.json()
    if (r.ok) { setMovements(p => [d,...p]); const ir = await apiFetch('/inventory'); if(ir.ok) setInventory(await ir.json()) }
    return r.ok
  }

  // CLIENTS
  const addClient = async (c) => {
    const r = await apiFetch('/clients', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(c) })
    const d = await r.json(); setClients(p => [d,...p])
  }
  const updateClient = async (id, d) => {
    await apiFetch(`/clients/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) })
    setClients(p => p.map(c => c.id===id ? {...c,...d} : c))
  }
  const deleteClient = async (id) => {
    await apiFetch(`/clients/${id}`, { method:'DELETE' }); setClients(p => p.filter(c => c.id!==id))
  }

  // INVENTORY
  const addInventoryItem = async (item) => {
    const r = await apiFetch('/inventory', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(item) })
    const d = await r.json()
    // Si el backend ya devuelve provider_name lo usa; si no, lo busca localmente
    if (d.provider_id && !d.provider_name) {
      const found = (providers || []).find(p => p.id === d.provider_id)
      if (found) d.provider_name = found.name
    }
    setInventory(p => [d,...p])
  }
  const updateInventoryItem = async (id, d) => {
    await apiFetch(`/inventory/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) })
    // Buscar provider_name localmente para actualizar el estado sin recargar
    const provider_name = d.provider_id
      ? ((providers || []).find(p => p.id === d.provider_id)?.name || null)
      : null
    setInventory(p => p.map(i => i.id===id ? {...i,...d, provider_name} : i))
  }
  const deleteInventoryItem = async (id) => {
    await apiFetch(`/inventory/${id}`, { method:'DELETE' }); setInventory(p => p.filter(i => i.id!==id))
  }

  // PROVIDERS
  const addProvider = async (prov) => {
    const r = await apiFetch('/providers', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(prov) })
    const d = await r.json(); setProviders(p => [d,...p])
  }
  const updateProvider = async (id, d) => {
    await apiFetch(`/providers/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) })
    setProviders(p => p.map(x => x.id===id ? {...x,...d} : x))
  }
  const deleteProvider = async (id) => {
    await apiFetch(`/providers/${id}`, { method:'DELETE' }); setProviders(p => p.filter(x => x.id!==id))
  }

  // QUOTES
  const addQuote = async (q) => {
    const r = await apiFetch('/quotes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(q) })
    const d = await r.json(); setQuotes(p => [d,...p])
  }
  const deleteQuote = async (id) => {
    await apiFetch(`/quotes/${id}`, { method:'DELETE' }); setQuotes(p => p.filter(q => q.id!==id))
  }

  // SALES — KEY FIX: reload quotes from API after sale to get backend truth
  const addSale = async (sale) => {
    const r = await apiFetch('/sales', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(sale) })
    const d = await r.json()
    if (r.ok) {
      let updatedSales = [d, ...sales.filter((currentSale) => String(currentSale.id) !== String(d.id))]
      setSales(updatedSales)

      if (sale.sourceQuoteId) {
        rememberConvertedQuoteId(sale.sourceQuoteId)
        setQuotes((prev) => prev.filter((quote) => String(quote.id) !== String(sale.sourceQuoteId)))
      }

      const sr = await apiFetch('/sales')
      if (sr.ok) {
        updatedSales = await sr.json()
        setSales(updatedSales)
      }

      const qr = await apiFetch('/quotes')
      if (qr.ok) {
        const quotesData = await qr.json()
        setQuotes(filterConvertedQuotes(quotesData, updatedSales))
      } else if (sale.sourceQuoteId) {
        setQuotes((prev) => prev.filter((quote) => String(quote.id) !== String(sale.sourceQuoteId)))
      }

      const ir = await apiFetch('/inventory')
      if (ir.ok) setInventory(await ir.json())

      const mr = await apiFetch('/movements')
      if (mr.ok) setMovements(await mr.json())
    }
    return d
  }
  const deleteSale = async (id) => {
    await apiFetch(`/sales/${id}`, { method:'DELETE' }); setSales(p => p.filter(s => s.id!==id))
  }

  // COMPANY
  const updateCompany = async (d) => {
    try {
      const r = await apiFetch('/company', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) })
      if (!r.ok) return { ok:false }
      const updated = await r.json()
      // El backend ahora devuelve el registro completo; si por alguna razon
      // solo devolviera {ok:true}, usamos los datos enviados como fallback.
      const stored = (updated && updated.name !== undefined) ? updated : d
      setCompany(stored)
      return { ok:true, stored }
    } catch(e) { return { ok:false } }
  }

  return (
    <AppContext.Provider value={{
      clients, quotes, inventory, sales, providers, company, users, movements,
      loadUsers, createUser, updateUser, toggleUserActive, resetUserPassword,
      loadMovements, createMovement,
      addClient, updateClient, deleteClient,
      addInventoryItem, updateInventoryItem, deleteInventoryItem,
      addProvider, updateProvider, deleteProvider,
      addQuote, deleteQuote, addSale, deleteSale,
      updateCompany, loadAll
    }}>
      {children}
    </AppContext.Provider>
  )
}

export default AppContext
