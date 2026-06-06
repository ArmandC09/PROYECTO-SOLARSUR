import React, { useMemo, useState, useEffect, useContext, useRef } from 'react'

const ITEMS_PER_PAGE = 25
import AppContext from '../context/AppContext'
import ModalPortal from './ModalPortal'
import PhoneInput from './PhoneInput'

export default function Providers() {
  const { providers, addProvider, updateProvider, deleteProvider } =
    useContext(AppContext)

  const [form, setForm] = useState({ name: '', contact: '', phone: '' })
  const [editingId, setEditingId] = useState(null)
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)

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


  const resetForm = () => {
    setEditingId(null)
    setForm({ name: '', contact: '', phone: '' })
    setShowForm(false)
  }

  const submit = (e) => {
    e.preventDefault()

    if (editingId) {
      updateProvider(editingId, form)
    } else {
      addProvider(form)
    }

    resetForm()
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setForm({
      name: p.name || '',
      contact: p.contact || '',
      phone: p.phone || ''
    })
    setShowForm(true)
  }

  const filtered = useMemo(() => providers.filter((p) => {
    if (!query) return true
    const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    const q = norm(query)
    return (
      norm(p.name).includes(q) ||
      norm(p.contact).includes(q) ||
      norm(p.phone).includes(q)
    )
  }), [providers, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage-1)*ITEMS_PER_PAGE, safePage*ITEMS_PER_PAGE)

  return (
    <section className="clients-page fade-in providers-page">
      <div className="clients-head"><h1>Proveedores</h1></div>

      <div className="clients-main-card providers-main-card">
        <div className="clients-toolbar">
          <button type="button" className="clients-new-btn" onClick={() => {
            setEditingId(null)
            setForm({ name: '', contact: '', phone: '' })
            setShowForm(true)
          }}>
            <span className="clients-plus">＋</span> Nuevo Proveedor
          </button>

          <div className="clients-search-wrap">
            <span className="clients-search-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
              </svg>
            </span>
            <input
              className="clients-search-input"
              placeholder="Buscar por nombre, contacto o teléfono"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="clients-empty">No hay proveedores registrados.</div>
        ) : (
          <div className="clients-table-wrap"
            ref={tableScrollRef}>
            <table className="data-table providers-table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Contacto</th>
                  <th>Teléfono</th>
                  <th className="align-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ color: '#0b1220' }}>{p.name}</strong>
                    </td>
                    <td>{p.contact || '—'}</td>
                    <td>{p.phone || '—'}</td>
                    <td className="align-right">
                      <button type="button" className="btn-icon btn-icon-edit" onClick={() => startEdit(p)} title="Editar">✎</button>
                      <button
                        type="button"
                        className="btn-icon btn-icon-delete"
                        onClick={() => {
                          if (window.confirm('¿Eliminar proveedor?')) deleteProvider(p.id)
                        }}
                        title="Eliminar"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="clients-pagination">
            <div className="clients-pagination-info">
              {filtered.length===0 ? 'Sin registros' : `Mostrando ${(safePage-1)*ITEMS_PER_PAGE+1}–${Math.min(safePage*ITEMS_PER_PAGE,filtered.length)} de ${filtered.length}`}
            </div>
            <div className="clients-pagination-controls">
              <button type="button" className="clients-page-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage===1}>‹</button>
              {(() => {
                const WINDOW = 5
                let start = Math.max(1, safePage - Math.floor(WINDOW / 2))
                let end   = Math.min(totalPages, start + WINDOW - 1)
                if (end - start + 1 < WINDOW) start = Math.max(1, end - WINDOW + 1)
                const pages = []
                if (start > 1) {
                  pages.push(<button key={1} type="button" className="clients-page-number" onClick={()=>setPage(1)}>1</button>)
                  if (start > 2) pages.push(<span key="e1" style={{padding:'0 4px',color:'#9ca3af'}}>…</span>)
                }
                for (let p = start; p <= end; p++) {
                  pages.push(
                    <button key={p} type="button" className={`clients-page-number ${p===safePage?'active':''}`} onClick={()=>setPage(p)}>{p}</button>
                  )
                }
                if (end < totalPages) {
                  if (end < totalPages - 1) pages.push(<span key="e2" style={{padding:'0 4px',color:'#9ca3af'}}>…</span>)
                  pages.push(<button key={totalPages} type="button" className="clients-page-number" onClick={()=>setPage(totalPages)}>{totalPages}</button>)
                }
                return pages
              })()}
              <button type="button" className="clients-page-next" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages}>Siguiente ›</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <ModalPortal>
          <div className="ss-overlay" onClick={(e) => { if (e.target === e.currentTarget) resetForm() }}>
            <div className="ss-modal providers-modal">
              <div className="ss-modal-head">
                <div>
                  <h3>{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                  <p>Formulario centralizado sobre fondo gris opaco</p>
                </div>
                <button type="button" className="ss-modal-close" onClick={resetForm}>✕</button>
              </div>

              <form onSubmit={submit}>
                <div className="ss-modal-body">
                  <div className="ss-field">
                    <label>Nombre</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      placeholder="Nombre del proveedor"
                      maxLength={120}
                    />
                  </div>

                  <div className="ss-field">
                    <label>Contacto</label>
                    <input
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                      placeholder="Nombre de contacto"
                      maxLength={100}
                    />
                  </div>

                  <div className="ss-field">
                    <label>Teléfono</label>
                    <PhoneInput value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
                  </div>
                </div>

                <div className="ss-modal-foot">
                  <button type="button" className="ss-btn-cancel" onClick={resetForm}>Cancelar</button>
                  <button type="submit" className="ss-btn-primary">
                    {editingId ? 'Guardar cambios' : 'Crear proveedor'}
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
