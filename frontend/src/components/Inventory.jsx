import React, { useMemo, useState, useContext, useEffect, useRef } from 'react'
import AppContext from '../context/AppContext'
import AuthContext from '../context/AuthContext'
import ModalPortal from './ModalPortal'

const ITEMS_PER_PAGE = 25

export default function Inventory() {
  const {
    inventory,
    providers,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem
  } = useContext(AppContext)
  const { user } = useContext(AuthContext)
  const canWrite = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN' || user?.role === 'WAREHOUSE'

  const tableScrollRef = useRef(null)
  const tableTouchRef  = useRef({})

  useEffect(() => {
    const wrapper = tableScrollRef.current
    if (!wrapper) return

    let startX = 0, startY = 0, scrollLeft = 0, direction = null

    const onTouchStart = (e) => {
      if (!e.touches?.length) return
      const t = e.touches[0]
      startX = t.clientX
      startY = t.clientY
      scrollLeft = wrapper.scrollLeft
      direction = null
    }

    const onTouchMove = (e) => {
      if (!e.touches?.length) return
      const t = e.touches[0]
      const dx = t.clientX - startX
      const dy = t.clientY - startY

      if (!direction) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
        direction = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical'
      }

      if (direction === 'horizontal') {
        e.preventDefault()
        wrapper.scrollLeft = scrollLeft - dx
      }
      // si es vertical, no hacemos nada y el navegador scrollea la página
    }

    wrapper.addEventListener('touchstart', onTouchStart, { passive: true })
    wrapper.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      wrapper.removeEventListener('touchstart', onTouchStart)
      wrapper.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Provider search state
  const [providerQuery, setProviderQuery] = useState('')
  const [showProviderDropdown, setShowProviderDropdown] = useState(false)
  const providerInputRef = useRef(null)

  const [form, setForm] = useState({
    name: '', sku: '', qty: 0, price: 0,
    provider_id: null, provider_name: ''
  })

  const filteredProviders = useMemo(() => {
    const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    const q = norm(providerQuery.trim())
    if (!q) return providers || []
    return (providers || []).filter(p =>
      norm(p.name).includes(q)
    )
  }, [providers, providerQuery])

  const selectProvider = (p) => {
    setForm(f => ({ ...f, provider_id: p.id, provider_name: p.name }))
    setProviderQuery(p.name)
    setShowProviderDropdown(false)
  }

  const clearProvider = () => {
    setForm(f => ({ ...f, provider_id: null, provider_name: '' }))
    setProviderQuery('')
  }

  const resetForm = () => {
    setEditingId(null)
    setForm({ name: '', sku: '', qty: 0, price: 0, provider_id: null, provider_name: '' })
    setProviderQuery('')
    setShowProviderDropdown(false)
  }

  const openNewForm = () => { resetForm(); setFormOpen(true) }
  const closeForm = () => { resetForm(); setFormOpen(false) }

  const startEdit = (it) => {
    setEditingId(it.id)
    const pName = it.provider_name || (providers || []).find(p => p.id === it.provider_id)?.name || ''
    setForm({
      name: it.name || '', sku: it.sku || '',
      qty: it.qty ?? 0, price: it.price ?? 0,
      provider_id: it.provider_id || null, provider_name: pName
    })
    setProviderQuery(pName)
    setFormOpen(true)
  }

  const submit = (e) => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(), sku: form.sku.trim(),
      qty: Number(form.qty) || 0, price: Number(form.price) || 0,
      provider_id: form.provider_id || null
    }
    if (editingId) updateInventoryItem(editingId, payload)
    else addInventoryItem(payload)
    closeForm()
  }

  const filtered = useMemo(() => {
    const norm2 = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    const q = norm2(query.trim())
    if (!q) return inventory
    return inventory.filter((it) =>
      norm2(it.name).includes(q) ||
      norm2(it.sku).includes(q) ||
      norm2(it.provider_name).includes(q)
    )
  }, [inventory, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [currentPage, totalPages])
  useEffect(() => { setCurrentPage(1) }, [query])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, currentPage])

  const startItem = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)

  const pageNumbers = useMemo(() => {
    const pages = []
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) pages.push(i); return pages }
    if (currentPage <= 3) return [1, 2, 3, '...', totalPages]
    if (currentPage >= totalPages - 2) return [1, '...', totalPages - 2, totalPages - 1, totalPages]
    return [1, '...', currentPage, '...', totalPages]
  }, [totalPages, currentPage])

  useEffect(() => {
    const handle = (e) => {
      if (providerInputRef.current && !providerInputRef.current.contains(e.target))
        setShowProviderDropdown(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <section className="inventory-page fade-in">
      <div className="inventory-head"><h1>Inventario</h1></div>

      <div className="inventory-shell">
        <div className="inventory-main-card">
          <div className="inventory-toolbar">
{canWrite && <button type="button" className="inventory-new-btn" onClick={openNewForm}>
              <span className="inventory-plus">＋</span>Nuevo producto
            </button>}
            <div className="inventory-search-wrap">
              <span className="inventory-search-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7"></circle>
                  <path d="M20 20l-3.5-3.5"></path>
                </svg>
              </span>
              <input className="inventory-search-input" placeholder="Buscar por nombre, SKU o proveedor"
                value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          {paginated.length === 0 ? (
            <div className="inventory-empty">No hay productos en inventario.</div>
          ) : (
            <>
              <div className="inventory-table-wrap"
              ref={tableScrollRef}>
                <table className="data-table inventory-table">
                  <thead>
                    <tr>
                      <th>Nombre</th><th>SKU</th><th>Proveedor</th>
                      <th>Cantidad</th><th>Precio</th>
{canWrite && <th className="align-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((it) => (
                      <tr key={it.id}>
                        <td>{it.name}</td>
                        <td><span className="inventory-sku-badge">{it.sku || '—'}</span></td>
                        <td>
                          {it.provider_name
                            ? <span className="inventory-provider-badge">{it.provider_name}</span>
                            : <span className="inventory-provider-none">—</span>}
                        </td>
                        <td><span className={`inventory-qty ${it.qty <= 0 ? 'low' : it.qty <= 10 ? 'low-stock' : ''}`}>{it.qty}</span></td>
                        <td>S/ {Number(it.price).toFixed(2)}</td>
{canWrite && <td className="align-right inventory-actions-cell">
                          <button type="button" className="inventory-action-btn edit" onClick={() => startEdit(it)}>
                            ✎ Editar
                          </button>
                          <button type="button" className="inventory-icon-btn delete"
                            onClick={() => { if (window.confirm('¿Eliminar producto?')) deleteInventoryItem(it.id) }}
                            title="Eliminar">🗑</button>
                        </td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="clients-pagination">
                  <div className="clients-pagination-info">
                    {filtered.length===0 ? 'Sin registros' : `Mostrando ${startItem}–${endItem} de ${filtered.length}`}
                  </div>
                  <div className="clients-pagination-controls">
                    <button type="button" className="clients-page-btn" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}>‹</button>
                    {(() => {
                      const WINDOW = 5
                      let start = Math.max(1, currentPage - Math.floor(WINDOW / 2))
                      let end   = Math.min(totalPages, start + WINDOW - 1)
                      if (end - start + 1 < WINDOW) start = Math.max(1, end - WINDOW + 1)
                      const pages = []
                      if (start > 1) {
                        pages.push(<button key={1} type="button" className="clients-page-number" onClick={()=>setCurrentPage(1)}>1</button>)
                        if (start > 2) pages.push(<span key="e1" style={{padding:'0 4px',color:'#9ca3af'}}>…</span>)
                      }
                      for (let p = start; p <= end; p++) {
                        pages.push(
                          <button key={p} type="button" className={`clients-page-number ${p===currentPage?'active':''}`} onClick={()=>setCurrentPage(p)}>{p}</button>
                        )
                      }
                      if (end < totalPages) {
                        if (end < totalPages - 1) pages.push(<span key="e2" style={{padding:'0 4px',color:'#9ca3af'}}>…</span>)
                        pages.push(<button key={totalPages} type="button" className="clients-page-number" onClick={()=>setCurrentPage(totalPages)}>{totalPages}</button>)
                      }
                      return pages
                    })()}
                    <button type="button" className="clients-page-next" onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages}>Siguiente ›</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {formOpen && (
        <ModalPortal>
          <div className="ss-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeForm() }}>
            <div className="ss-modal ss-modal-wide inventory-modal">
              <div className="ss-modal-head">
                <div>
                  <h3>{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                  <p>Gestiona el inventario sin mover la tabla principal</p>
                </div>
                <button type="button" className="ss-modal-close" onClick={closeForm}>✕</button>
              </div>

              <form className="ss-modal-body inventory-modal-body" onSubmit={submit}>
                <div className="ss-row-2">
                  <div className="ss-field">
                    <label>Nombre</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ej: Panel Solar 200W" required maxLength={150} />
                  </div>

                  <div className="ss-field">
                    <label>SKU</label>
                    <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      placeholder="Ej: PS200W" maxLength={50} />
                  </div>
                </div>

                <div className="ss-field">
                  <label>Proveedor</label>
                  <div className="inventory-provider-field" ref={providerInputRef}>
                    <div className="inventory-provider-input-wrap">
                      <input
                        value={providerQuery}
                        onChange={(e) => {
                          setProviderQuery(e.target.value)
                          setForm(f => ({ ...f, provider_id: null }))
                          setShowProviderDropdown(true)
                        }}
                        onFocus={() => setShowProviderDropdown(true)}
                        placeholder="Buscar proveedor..."
                        autoComplete="off"
                      />
                      {form.provider_id && (
                        <button type="button" className="inventory-provider-clear"
                          onClick={clearProvider} title="Quitar proveedor">✕</button>
                      )}
                    </div>
                    {showProviderDropdown && filteredProviders.length > 0 && (
                      <div className="inventory-provider-dropdown">
                        {filteredProviders.slice(0, 8).map(p => (
                          <div key={p.id} className="inventory-provider-option" onMouseDown={() => selectProvider(p)}>
                            {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {showProviderDropdown && providerQuery && filteredProviders.length === 0 && (
                      <div className="inventory-provider-dropdown">
                        <div className="inventory-provider-empty">Sin resultados</div>
                      </div>
                    )}
                    {form.provider_id && (
                      <div className="inventory-provider-selected">✓ Proveedor: <strong>{form.provider_name}</strong></div>
                    )}
                  </div>
                </div>

                <div className="ss-row-2">
                  <div className="ss-field">
                    <label>Cantidad</label>
                    <input type="number" min="0" value={form.qty}
                      onChange={(e) => setForm({ ...form, qty: e.target.value })} />
                  </div>

                  <div className="ss-field">
                    <label>Precio Unitario</label>
                    <input type="number" step="0.01" min="0" value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
              </form>

              <div className="ss-modal-foot">
                <button type="button" className="ss-btn-cancel" onClick={closeForm}>Cancelar</button>
                <button type="button" className="ss-btn-primary" onClick={submit}>
                  {editingId ? 'Guardar cambios' : 'Guardar producto'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  )
}
