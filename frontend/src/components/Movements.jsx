import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import AuthContext from '../context/AuthContext'
import ModalPortal from './ModalPortal'
import StyledSelect from './StyledSelect'

const API = '/api'

function getToken() {
  return sessionStorage.getItem('solarsur_token') || ''
}

async function apiFetch(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
  return res
}

function getInventoryOptions(inventory) {
  if (inventory.length === 0) return [{ value: '', label: 'No hay productos' }]

  return inventory.map((item) => ({
    value: String(item.id),
    label: `${item.name}${item.sku ? ` (${item.sku})` : ''} - Stock actual: ${item.qty}`
  }))
}

const MOVEMENT_TYPE_OPTIONS = [
  { value: 'IN', label: 'Entrada' },
  { value: 'OUT', label: 'Salida' }
]

export default function Movements() {
  const { user } = useContext(AuthContext)

  const canAccess =
    user?.role === 'WAREHOUSE' ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPERADMIN'

  const [inventory, setInventory] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [query, setQuery] = useState('')
  const tableScrollRef = useRef(null)
  const tableTouchRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, dragging: false })
  const [form, setForm] = useState({
    inventory_id: '',
    type: 'IN',
    qty: 1,
    note: ''
  })

  const inventoryOptions = useMemo(() => getInventoryOptions(inventory), [inventory])

  const showMsg = (text) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 2500)
  }

  const loadInventory = async () => {
    const res = await apiFetch('/inventory')
    const data = await res.json().catch(() => [])
    if (!res.ok) throw new Error('No se pudo cargar inventario')
    setInventory(Array.isArray(data) ? data : [])
    return data
  }

  const loadMovements = async () => {
    const res = await apiFetch('/movements')
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(data?.message || `Error al cargar movimientos (${res.status})`)
    }

    setMovements(Array.isArray(data) ? data : [])
    return data
  }

  const loadAll = async () => {
    if (!canAccess) return
    setLoading(true)
    setError('')
    try {
      const inv = await loadInventory()
      await loadMovements()

      if (!form.inventory_id && inv.length > 0) {
        setForm((prev) => ({ ...prev, inventory_id: String(inv[0].id) }))
      }
    } catch (e) {
      console.error(e)
      setError(e.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return movements

    return movements.filter((m) => {
      const name = String(m.inventory_name || '').toLowerCase()
      const sku = String(m.sku || '').toLowerCase()
      const username = String(m.username || '').toLowerCase()
      const note = String(m.reason || '').toLowerCase()
      const type = String(m.type || '').toLowerCase()

      return (
        name.includes(q) ||
        sku.includes(q) ||
        username.includes(q) ||
        note.includes(q) ||
        type.includes(q)
      )
    })
  }, [movements, query])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')

    const qty = Number(form.qty)

    if (!form.inventory_id) {
      setError('Selecciona un producto')
      return false
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      setError('La cantidad debe ser mayor a 0')
      return false
    }

    try {
      setSubmitting(true)

      const payload = {
        inventory_id: Number(form.inventory_id),
        type: form.type,
        qty,
        note: form.note
      }

      const res = await apiFetch('/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data?.message || `Error al registrar movimiento (${res.status})`)
        return false
      }

      showMsg('Movimiento registrado')
      setForm((prev) => ({
        ...prev,
        qty: 1,
        note: ''
      }))

      await loadAll()
      return true
    } catch (e2) {
      console.error(e2)
      setError('Error de conexión al registrar movimiento')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const handleTableTouchStart = (event) => {
    const wrapper = tableScrollRef.current
    if (!wrapper || !event.touches?.length) return

    const touch = event.touches[0]
    tableTouchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      scrollLeft: wrapper.scrollLeft,
      dragging: false
    }
  }

  const handleTableTouchMove = (event) => {
    const wrapper = tableScrollRef.current
    if (!wrapper || !event.touches?.length) return

    const touch = event.touches[0]
    const dx = touch.clientX - tableTouchRef.current.startX
    const dy = touch.clientY - tableTouchRef.current.startY

    if (!tableTouchRef.current.dragging) {
      if (Math.abs(dx) < 6) return
      if (Math.abs(dx) <= Math.abs(dy)) return
      tableTouchRef.current.dragging = true
    }

    event.preventDefault()
    wrapper.scrollLeft = tableTouchRef.current.scrollLeft - dx
  }

  if (!canAccess) {
    return (
      <section className="card">
        <h3>Movimientos de Almacén</h3>
        <p>No tienes permisos para ver esta sección.</p>
      </section>
    )
  }

  return (
    <section className="clients-page fade-in movements-page">
      <div className="clients-head"><h1>Movimientos de Almacén</h1></div>

      <div className="clients-main-card movements-main-card">
        <div className="clients-toolbar">
          <button type="button" className="clients-new-btn" onClick={() => setShowForm(true)}>
            <span className="clients-plus">＋</span> Registrar movimiento
          </button>

          <div className="clients-search-wrap">
            <span className="clients-search-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
              </svg>
            </span>
            <input
              className="clients-search-input"
              placeholder="Buscar por producto, SKU, usuario, nota o tipo"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="error" role="alert">{error}</div>}

        {msg && (
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              marginBottom: 12,
              background: '#e6f0ff',
              color: '#0b5ed7'
            }}
          >
            {msg}
          </div>
        )}

        <div className="movements-summary-row">
          <div className="movements-summary-card">
            <span>Total movimientos</span>
            <strong>{movements.length}</strong>
          </div>
          <div className="movements-summary-card">
            <span>Entradas</span>
            <strong>{movements.filter((m) => m.type === 'IN').length}</strong>
          </div>
          <div className="movements-summary-card">
            <span>Salidas</span>
            <strong>{movements.filter((m) => m.type === 'OUT').length}</strong>
          </div>
          <button type="button" className="secondary movements-refresh-btn" onClick={loadAll}>Recargar</button>
        </div>

        <h3 style={{ marginTop: 10 }}>Historial de movimientos</h3>

        {loading ? (
          <p style={{ marginTop: 12 }}>Cargando...</p>
        ) : filtered.length === 0 ? (
          <p style={{ marginTop: 12 }}>No hay movimientos registrados.</p>
        ) : (
          <div
            className="clients-table-wrap movements-table-wrap"
            style={{ marginTop: 15 }}
            ref={tableScrollRef}
            onTouchStart={handleTableTouchStart}
            onTouchMove={handleTableTouchMove}
          >
            <table className="data-table movements-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Nota</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.created_at
                        ? new Date(m.created_at).toLocaleString()
                        : '—'}
                    </td>
                    <td>{m.inventory_name || '—'}</td>
                    <td>{m.sku || '—'}</td>
                    <td>
                      <span
                        className="pill"
                        style={{
                          background:
                            m.type === 'IN'
                              ? 'rgba(22,163,74,0.12)'
                              : 'rgba(239,68,68,0.12)',
                          color:
                            m.type === 'IN'
                              ? '#166534'
                              : '#991b1b'
                        }}
                      >
                        {m.type === 'IN' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td>{m.qty}</td>
                    <td>{m.reason || '—'}</td>
                    <td>{m.username || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <ModalPortal>
          <div className="ss-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}>
            <div className="ss-modal movements-modal">
              <div className="ss-modal-head">
                <div>
                  <h3>Registrar Movimiento</h3>
                  <p>Entrada o salida de almacén en una ventana centrada</p>
                </div>
                <button type="button" className="ss-modal-close" onClick={() => setShowForm(false)}>✕</button>
              </div>

              <form onSubmit={async (e) => {
                const ok = await submit(e)
                if (ok) setShowForm(false)
              }}>
                <div className="ss-modal-body">
                  <div className="ss-field">
                    <label>Producto</label>
                    <StyledSelect
                      value={form.inventory_id}
                      onChange={(nextValue) => setForm({ ...form, inventory_id: nextValue })}
                      options={inventoryOptions}
                      disabled={inventory.length === 0}
                    />
                  </div>

                  <div className="ss-row-2">
                    <div className="ss-field">
                      <label>Tipo de movimiento</label>
                      <StyledSelect
                        value={form.type}
                        onChange={(nextValue) => setForm({ ...form, type: nextValue })}
                        options={MOVEMENT_TYPE_OPTIONS}
                      />
                    </div>

                    <div className="ss-field">
                      <label>Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={form.qty}
                        onChange={(e) => setForm({ ...form, qty: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="ss-field">
                    <label>Motivo / Nota</label>
                    <input
                      value={form.note}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                      placeholder="Ej: ingreso de proveedor, salida para instalación..."
                    />
                  </div>
                </div>

                <div className="ss-modal-foot">
                  <button type="button" className="ss-btn-cancel" onClick={() => setShowForm(false)}>Cancelar</button>
                  <button type="submit" className="ss-btn-primary" disabled={submitting}>
                    {submitting ? 'Guardando...' : 'Registrar movimiento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  )
}
