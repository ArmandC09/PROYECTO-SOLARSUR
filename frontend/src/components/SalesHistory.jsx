import React, { useContext, useState, useMemo } from 'react'
import AppContext from '../context/AppContext'
import { downloadCSV } from '../utils/export'

export default function SalesHistory() {
  const { sales, clients } = useContext(AppContext)
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)

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

  return (
    <section className="sales-history-page fade-in">
      <div className="sales-history-header">
        <div>
          <h1>Historial de Ventas</h1>
          <p className="sales-history-subtitle">
            {sales.length} ventas registradas · Total: S/ {totalSales.toFixed(2)}
          </p>
        </div>
        <button className="sales-history-export-btn" onClick={exportCSV}>
          ⬇ Exportar CSV
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
          <div className="sales-history-list">
            {filtered.map((s) => {
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
      </div>
    </section>
  )
}
