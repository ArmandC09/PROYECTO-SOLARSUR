import React, { useContext, useMemo, useState } from 'react'
import AppContext from '../context/AppContext'


const DISCOUNT_TYPES = [
  { value: 'general',    label: 'Descuento general' },
  { value: 'promocion',  label: 'Promoción' },
  { value: 'acuerdo',    label: 'Acuerdo comercial' },
  { value: 'fidelidad',  label: 'Fidelidad de cliente' },
  { value: 'otro',       label: 'Otro' },
]

export default function Sales({ onNavigate }) {
  const { quotes, clients, addSale } = useContext(AppContext)

  const [selectedQuote, setSelectedQuote] = useState(null)
  const [discountMode, setDiscountMode] = useState('amount')
  const [discountValue, setDiscountValue] = useState('0')
  const [discountType, setDiscountType] = useState('general')
  const [discountReason, setDiscountReason] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    const key = Date.now()
    setToast({ msg, type, key })
    setTimeout(() => setToast(null), 3500)
  }

  const getClientName = (quote) => {
    return (
      clients.find(
        (c) => String(c.id) === String(quote.client_id || quote.clientId)
      )?.name || '—'
    )
  }

  const subtotal = Number(selectedQuote?.total || 0)
  const numericDiscount = Number(discountValue || 0)

  const discountAmount = useMemo(() => {
    if (!selectedQuote) return 0
    if (discountMode === 'percent') {
      return subtotal * (numericDiscount / 100)
    }
    return numericDiscount
  }, [selectedQuote, discountMode, numericDiscount, subtotal])

  const discountPercent = useMemo(() => {
    if (!subtotal) return 0
    if (discountMode === 'percent') return numericDiscount
    return (discountAmount / subtotal) * 100
  }, [subtotal, discountMode, numericDiscount, discountAmount])

  const finalTotal = Math.max(subtotal - discountAmount, 0)

  const openQuote = (quote) => {
    setSelectedQuote(quote)
    setDiscountMode('amount')
    setDiscountValue('0')
    setDiscountType('general')
    setDiscountReason('')
  }

  const cancelConversion = () => {
    setSelectedQuote(null)
    setDiscountMode('amount')
    setDiscountValue('0')
    setDiscountType('general')
    setDiscountReason('')
  }

  const convertQuoteToSale = async () => {
    if (!selectedQuote) return

    const sale = {
      client_id: selectedQuote.client_id || selectedQuote.clientId,
      items: selectedQuote.items || [],
      total: finalTotal,
      subtotal,
      discount: discountAmount,
      discountType: discountMode,
      discountValue: numericDiscount,
      discountCategory: discountType,
      discountReason: discountReason.trim(),
      sourceQuoteId: selectedQuote.id
    }

    const result = await addSale(sale)
    if (!result?.ok) {
      alert(`No se pudo completar la venta:\n\n${result?.message || 'Error desconocido'}`)
      return
    }
    cancelConversion()
    showToast('Cotización convertida a venta exitosamente')
    // addSale ya terminó todos los fetches — navegar directo
    if (onNavigate) onNavigate('history')
  }

  return (
    <section className="sales-page">
      <div className="sales-card-main">
        <div className="sales-page-head">
          <h1>Generar Venta</h1>
        </div>

        {!selectedQuote ? (
          <>
            <p className="sales-intro">
              Selecciona una cotización para convertirla en una venta real.
            </p>

            {quotes.length === 0 ? (
              <div className="sales-empty-state">No hay cotizaciones.</div>
            ) : (
              <div className="sales-quote-list">
                {quotes.map((q) => (
                  <div key={q.id} className="sales-quote-item">
                    <div className="sales-quote-item-info">
                      <span>
                        <strong>
                          {new Date(q.created_at || q.date).toLocaleString()}
                        </strong>
                      </span>
                      <span>Cliente: {getClientName(q)}</span>
                      <span>Subtotal: S/ {Number(q.total || 0).toFixed(2)}</span>
                    </div>

                    <div className="sales-quote-item-right">
                      <span className="sales-status-pill">Pendiente</span>
                      <button
                        type="button"
                        className="sales-open-btn"
                        onClick={() => openQuote(q)}
                      >
                        Convertir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="sales-intro">
              Convierte esta cotización en una venta
              <span className="sales-intro-soft">
                {' '} (puedes ajustar el descuento si lo deseas):
              </span>
            </p>

            <div className="sales-selected-head">
              <div className="sales-selected-meta">
                <span>• <strong>{new Date(selectedQuote.created_at || selectedQuote.date).toLocaleString()}</strong></span>
                <span>• <strong>Cliente:</strong> {getClientName(selectedQuote)}</span>
                <span>• <strong>Subtotal:</strong> S/ {subtotal.toFixed(2)}</span>
              </div>

              <span className="sales-status-pill">Pendiente</span>
            </div>

            <div className="sales-info-banner">
              <span className="sales-info-icon">i</span>
              <span>
                <strong>Descuento:</strong> aplícalo en porcentaje (%) o monto (S/). Tú eliges la forma más fácil.
              </span>
            </div>

            <div className="sales-discount-section">
              <div className="sales-discount-top">
                <h3>Aplicar descuento</h3>

                <div className="sales-mode-switch">
                  <button
                    type="button"
                    className={discountMode === 'percent' ? '' : 'inactive'}
                    onClick={() => setDiscountMode('percent')}
                  >
                    Porcentaje (%)
                  </button>
                  <button
                    type="button"
                    className={discountMode === 'amount' ? '' : 'inactive'}
                    onClick={() => setDiscountMode('amount')}
                  >
                    Monto (S/)
                  </button>
                </div>
              </div>

              <div className="sales-discount-box">
                <div className="sales-discount-fields">
                  <div className="sales-discount-field">
                    <label>Tipo de descuento</label>
                    <StyledSelect
                      value={discountType}
                      options={DISCOUNT_TYPES}
                      onChange={(val) => setDiscountType(val)}
                    />
                  </div>

                  <div className="sales-discount-arrow">→</div>

                  <div className="sales-discount-field">
                    <label>
                      {discountMode === 'percent'
                        ? 'Ingresa el porcentaje de descuento'
                        : 'Ingresa el monto de descuento'}
                    </label>

                    <div className="sales-money-input">
                      <span>{discountMode === 'percent' ? '%' : 'S/'}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                      />
                    </div>

                    <div className="sales-equivalent-chip">
                      Equivale a un {discountPercent.toFixed(2)}% de descuento
                    </div>
                  </div>
                </div>

                {/* Campo de motivo */}
                <div className="sales-discount-reason-row">
                  <label className="sales-discount-reason-label">
                    Motivo del descuento <span className="sales-discount-reason-opt">(opcional)</span>
                  </label>
                  <div className="sales-discount-reason-options">
                    {['Acuerdo previo', 'Volumen de compra', 'Temporada', 'Cliente frecuente'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`sales-reason-chip${discountReason === opt ? ' active' : ''}`}
                        onClick={() => setDiscountReason(discountReason === opt ? '' : opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="sales-discount-reason-input"
                    placeholder="O escribe un motivo personalizado..."
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    maxLength={120}
                  />
                </div>

                <div className="sales-summary-grid">
                  <div className="sales-summary-col">
                    <span>Subtotal</span>
                    <strong>S/ {subtotal.toFixed(2)}</strong>
                  </div>

                  <div className="sales-summary-col sales-summary-discount">
                    <span>Descuento</span>
                    <strong>- S/ {discountAmount.toFixed(2)}</strong>
                    <small>({discountPercent.toFixed(2)}%)</small>
                  </div>

                  <div className="sales-summary-divider"></div>

                  <div className="sales-summary-col sales-summary-total">
                    <span>Total a convertir</span>
                    <strong>S/ {finalTotal.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="sales-warning-box">
                  El descuento se aplicará a todos los productos de la cotización al convertirla en venta.
                </div>
              </div>
            </div>

            <div className="sales-actions-row">
              <button
                type="button"
                className="sales-cancel-btn"
                onClick={cancelConversion}
              >
                ← Cancelar
              </button>

              <button
                type="button"
                className="sales-convert-btn"
                onClick={convertQuoteToSale}
              >
                Convertir cotización en venta
              </button>
            </div>

            <div className="sales-bottom-note">
              <span className="sales-info-icon">i</span>
              <span>
                Después de convertirla, la cotización se marcará como <strong>"Convertida en venta"</strong> y pasará al módulo de Ventas.
              </span>
            </div>
          </>
        )}
      </div>

      {/* Toast global fixed bottom-right */}
      {toast && (
        <div
          key={toast.key}
          style={{
            position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999,
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: '#fff', padding: '13px 22px', borderRadius: '10px',
            fontWeight: 600, fontSize: '0.97rem', boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
            animation: 'toastSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards'
          }}
        >
          {toast.msg}
        </div>
      )}
    </section>
  )
}
