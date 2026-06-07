import React, { useContext, useState, useEffect, useMemo, useRef } from 'react'

const ITEMS_PER_PAGE = 25
import AppContext from '../context/AppContext'
import AuthContext from '../context/AuthContext'
import { downloadCSV } from '../utils/export'
import ModalPortal from './ModalPortal'

export default function SalesHistory() {
  const { sales, clients, revertSale } = useContext(AppContext)
  const { user } = useContext(AuthContext)
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [revertModal, setRevertModal] = useState(null) // { id, clientName, total }
  const [reverting, setReverting] = useState(false)
  const [toast, setToast] = useState(null) // { msg, type }
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
      startX = t.clientX; startY = t.clientY
      scrollLeft = wrapper.scrollLeft; direction = null
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
    }

    wrapper.addEventListener('touchstart', onTouchStart, { passive: true })
    wrapper.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      wrapper.removeEventListener('touchstart', onTouchStart)
      wrapper.removeEventListener('touchmove', onTouchMove)
    }
  }, [tableScrollRef.current])


  const canRevert = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN'
  const canExport  = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN'

  const getClientName = (sale) =>
    clients.find(c => String(c.id) === String(sale.client_id || sale.clientId))?.name || '—'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sales
    return sales.filter(s => {
      const name = getClientName(s).toLowerCase()
      const items = (s.items || []).map(i => String(i.description || i.desc || '').toLowerCase()).join(' ')
      return name.includes(q) || items.includes(q)
    })
  }, [sales, clients, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage-1)*ITEMS_PER_PAGE, safePage*ITEMS_PER_PAGE)

  const exportCSV = () => {
    const rows = sales.map(s => ({
      id: s.id,
      fecha: s.created_at ? new Date(s.created_at).toLocaleString() : s.date ? new Date(s.date).toLocaleString() : '',
      cliente: getClientName(s),
      items: (s.items || []).map(i => `${i.qty}x ${i.description || i.desc}@${i.price}`).join(' | '),
      total: s.total || (s.items || []).reduce((a, b) => a + (b.qty * b.price), 0)
    }))
    downloadCSV('ventas.csv', rows, ['id', 'fecha', 'cliente', 'items', 'total'])
  }

  const totalSales = sales.reduce((acc, s) =>
    acc + (Number(s.total) || (s.items || []).reduce((a, b) => a + (Number(b.qty) * Number(b.price)), 0)), 0)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, key: Date.now() })
    setTimeout(() => setToast(null), 4000)
  }

  const handleRevertConfirm = async () => {
    if (!revertModal) return
    setReverting(true)
    const ok = await revertSale(revertModal.id)
    setReverting(false)
    setRevertModal(null)
    if (ok) {
      showToast(`Venta #${revertModal.id} revertida. Stock restaurado al inventario.`, 'success')
    } else {
      showToast('Error al revertir la venta. Intenta nuevamente.', 'error')
    }
  }

  return (
    <section className="sales-history-page fade-in">

      {/* ── TOAST ── */}
      {toast && (
        <div key={toast.key} style={{
          position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff', padding: '13px 22px', borderRadius: '10px',
          fontWeight: 600, fontSize: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          maxWidth: '380px',
          animation: 'toastSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards'
        }}>
          {toast.msg}
        </div>
      )}

      <div className="sales-history-header">
        <div>
          <h1>Historial de Ventas</h1>
          <p className="sales-history-subtitle">
            {sales.length} ventas registradas · Total: S/ {totalSales.toFixed(2)}
          </p>
        </div>
        <button className="sales-history-export-btn" onClick={exportCSV}>
          ⬇ Descargar Historial
        </button>
      </div>

      <div className="sales-history-card">
        {/* Search bar */}
        <div className="sales-history-toolbar">
          <div className="sales-history-search-wrap">
            <span className="sales-history-search-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7"></circle>
                <path d="M20 20l-3.5-3.5"></path>
              </svg>
            </span>
            <input
              className="sales-history-search"
              placeholder="Buscar por cliente o producto..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <span className="sales-history-count">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="sales-history-empty">
            <div className="sales-history-empty-icon">📋</div>
            <p>{query ? 'No se encontraron ventas con ese criterio.' : 'No hay ventas registradas aún.'}</p>
          </div>
        ) : (
          <div className="sales-history-list"
            ref={tableScrollRef}>
            {paginated.map((s) => {
              const saleTotal = Number(s.total) || (s.items || []).reduce((a, b) => a + (Number(b.qty) * Number(b.price)), 0)
              const dateStr = s.created_at
                ? new Date(s.created_at).toLocaleString('es-PE')
                : s.date ? new Date(s.date).toLocaleString('es-PE') : '—'
              const isExpanded = expandedId === s.id

              return (
                <div key={s.id} className={`sales-history-item ${isExpanded ? 'expanded' : ''}`}>
                  <div className="sales-history-item-main" onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                    <div className="sales-history-item-left">
                      <span className="sales-history-venta-badge">VENTA #{s.id}</span>
                      <div className="sales-history-item-info">
                        <strong>{getClientName(s)}</strong>
                        <span className="sales-history-date">{dateStr}</span>
                      </div>
                    </div>
                    <div className="sales-history-item-right">
                      <span className="sales-history-total">S/ {saleTotal.toFixed(2)}</span>
                      <span className="sales-history-items-count">{(s.items || []).length} ítem{(s.items || []).length !== 1 ? 's' : ''}</span>
                      {canRevert && (
                        <button
                          type="button"
                          className="sales-history-revert-btn"
                          title="Revertir venta y restaurar stock"
                          onClick={e => {
                            e.stopPropagation()
                            setRevertModal({ id: s.id, clientName: getClientName(s), total: saleTotal })
                          }}
                        >
                          ↩ Revertir
                        </button>
                      )}
                      <span className={`sales-history-chevron ${isExpanded ? 'open' : ''}`}>›</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="sales-history-items-detail">
                      <table className="sales-history-items-table">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th className="text-center">Cantidad</th>
                            <th className="text-right">P. Unit.</th>
                            <th className="text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(s.items || []).map((it, idx) => (
                            <tr key={idx}>
                              <td>{it.description || it.desc}</td>
                              <td className="text-center">{it.qty}</td>
                              <td className="text-right">S/ {Number(it.price).toFixed(2)}</td>
                              <td className="text-right">S/ {(Number(it.qty) * Number(it.price)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="3" className="text-right"><strong>Total</strong></td>
                            <td className="text-right"><strong>S/ {saleTotal.toFixed(2)}</strong></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
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

      {/* ── MODAL CONFIRMACIÓN REVERTIR ── */}
      {revertModal && (
        <ModalPortal>
          <div className="ss-overlay" onClick={e => { if (e.target === e.currentTarget && !reverting) setRevertModal(null) }}>
            <div className="ss-modal" style={{ maxWidth: '440px' }}>
              <div className="ss-modal-head">
                <h3 style={{ color: '#fff' }}>↩ Revertir Venta #{revertModal.id}</h3>
                <button className="ss-modal-close" onClick={() => setRevertModal(null)} disabled={reverting}>✕</button>
              </div>

              <div className="ss-modal-body" style={{ padding: '20px 24px' }}>
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
                  padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start'
                }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
                  <div>
                    <p style={{ fontWeight: 700, color: '#dc2626', margin: '0 0 4px' }}>Esta acción no se puede deshacer</p>
                    <p style={{ color: '#7f1d1d', fontSize: '13px', margin: 0 }}>
                      La venta será eliminada y todo el stock asociado volverá al inventario automáticamente.
                      La reversión quedará registrada en el monitoreo de auditoría.
                    </p>
                  </div>
                </div>

                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px 16px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#6b7280' }}>Cliente:</span>
                    <strong>{revertModal.clientName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Total de la venta:</span>
                    <strong style={{ color: '#dc2626' }}>S/ {revertModal.total.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="ss-modal-foot">
                <button
                  type="button"
                  className="ss-btn-cancel"
                  onClick={() => setRevertModal(null)}
                  disabled={reverting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRevertConfirm}
                  disabled={reverting}
                  style={{
                    background: reverting ? '#9ca3af' : '#dc2626',
                    color: '#fff', border: 'none', borderRadius: '8px',
                    padding: '10px 20px', fontWeight: 700, cursor: reverting ? 'not-allowed' : 'pointer',
                    fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  {reverting ? '⏳ Revirtiendo...' : '↩ Confirmar Reversión'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  )
}
