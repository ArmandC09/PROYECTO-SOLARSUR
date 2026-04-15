import React, { useState, useContext, useEffect, useMemo } from 'react'
import AppContext from '../context/AppContext'
import AuthContext from '../context/AuthContext'
import { printQuote } from '../utils/printQuote'
import ModalPortal from './ModalPortal'
import StyledSelect from './StyledSelect'

/* ── Qty control ── */
function QtyCtrl({ value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))}
        style={{ width:28, height:28, borderRadius:7, border:'1.5px solid #e5e7eb',
          background:'#f9fafb', color:'#374151', fontSize:16, display:'flex',
          alignItems:'center', justifyContent:'center', padding:0, cursor:'pointer' }}>−</button>
      <span style={{ minWidth:28, textAlign:'center', fontWeight:700, fontSize:14 }}>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        style={{ width:28, height:28, borderRadius:7, border:'1.5px solid #e5e7eb',
          background:'#f9fafb', color:'#374151', fontSize:16, display:'flex',
          alignItems:'center', justifyContent:'center', padding:0, cursor:'pointer' }}>+</button>
    </div>
  )
}

const IGV_OPTIONS = [
  { value: '0', label: 'Sin IGV (0%)' },
  { value: '18', label: 'Con IGV (18%)' }
]

export default function Quotes() {
  const { clients, quotes, inventory, addQuote, deleteQuote, company } = useContext(AppContext)
  const { user } = useContext(AuthContext)
  const canDelete = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN'

  const [query, setQuery]     = useState('')
  const [saving, setSaving]   = useState(false)

  // ── Nueva cotización modal ──
  const [newOpen, setNewOpen]         = useState(false)
  const [newClientId, setNewClientId] = useState('')
  const [newItems, setNewItems]       = useState([])
  const [prodQuery, setProdQuery]     = useState('')

  // ── Editor PDF modal ──
  const [edOpen,      setEdOpen]      = useState(false)
  const [edQuote,     setEdQuote]     = useState(null)
  const [edItems,     setEdItems]     = useState([])
  const [edClientId,  setEdClientId]  = useState('')
  const [edNote,      setEdNote]      = useState('')
  const [edIgv,       setEdIgv]       = useState(0)

  useEffect(() => {
    if (clients.length > 0 && !newClientId) setNewClientId(String(clients[0].id))
  }, [clients, newClientId])

  // ── Filtered lists ──
  const filteredQuotes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return quotes || []
    return (quotes || []).filter(qt => {
      const cn = clients.find(c => String(c.id) === String(qt.client_id || qt.clientId))?.name || ''
      return cn.toLowerCase().includes(q) ||
        (qt.items || []).some(it => (it.description||'').toLowerCase().includes(q))
    })
  }, [quotes, clients, query])

  const filteredProds = useMemo(() => {
    const q = prodQuery.trim().toLowerCase()
    if (!q) return inventory || []
    return (inventory || []).filter(p =>
      (p.name||'').toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q)
    )
  }, [inventory, prodQuery])

  const clientOptions = useMemo(
    () => [{ value: '', label: 'Seleccionar cliente...' }, ...clients.map((client) => ({ value: String(client.id), label: client.name }))],
    [clients]
  )

  const editorClientOptions = useMemo(
    () => [{ value: '', label: 'Seleccionar...' }, ...clients.map((client) => ({ value: String(client.id), label: client.name }))],
    [clients]
  )

  // ── New quote helpers ──
  const openNew = () => {
    setNewClientId(clients.length > 0 ? String(clients[0].id) : '')
    setNewItems([])
    setProdQuery('')
    setNewOpen(true)
  }

  const addProd = (prod) => {
    setNewItems(prev => {
      const ex = prev.find(it => String(it.inventory_id) === String(prod.id))
      if (ex) return prev.map(it => String(it.inventory_id) === String(prod.id) ? {...it, qty: it.qty+1} : it)
      return [...prev, { id: Date.now()+Math.random(), inventory_id: prod.id,
        description: prod.name, sku: prod.sku||'', qty:1, price: Number(prod.price||0) }]
    })
  }

  const newTotal = newItems.reduce((s,it) => s + it.qty * it.price, 0)

  const saveNewQuote = async () => {
    if (!newClientId) { alert('Seleccione un cliente'); return }
    if (newItems.length === 0) { alert('Agregue al menos un producto'); return }
    setSaving(true)
    await addQuote({
      client_id: Number(newClientId),
      items: newItems.map(it => ({
        inventory_id: it.inventory_id || null,
        description: it.description,
        qty: it.qty,
        price: it.price
      })),
      total: newTotal
    })
    setSaving(false)
    setNewOpen(false)
  }

  // ── Editor helpers ──
  const openEditor = (qt) => {
    setEdClientId(String(qt.client_id || qt.clientId || ''))
    setEdItems((qt.items||[]).map((it,i) => ({
      id: Date.now()+i, inventory_id: it.inventory_id||'',
      description: it.description||it.desc||'', qty: Number(it.qty||1), price: Number(it.price||0)
    })))
    setEdQuote({ id: `COT-${String(qt.id).padStart(5,'0')}`, date: qt.date||new Date().toISOString() })
    setEdNote('Esta cotización es válida por 15 días a partir de la fecha de emisión.')
    setEdIgv(0)
    setEdOpen(true)
  }

  const edClient   = clients.find(c => String(c.id) === String(edClientId))
  const edSubtotal = edItems.reduce((s,it) => s + it.qty*it.price, 0)
  const edIgvAmt   = edSubtotal * edIgv/100
  const edTotal    = edSubtotal + edIgvAmt

  const chItem = (id, field, val) =>
    setEdItems(p => p.map(it => it.id===id ? {...it, [field]: val} : it))

  const exportPdf = () => {
    printQuote(
      { id: edQuote?.id, date: edQuote?.date, total: edTotal, igv: edIgv, igvAmt: edIgvAmt, note: edNote,
        items: edItems.map(it => ({ description: it.description, qty: it.qty, price: it.price })) },
      edClient, company
    )
  }

  // ── Next quote code ──
  const nextCode = useMemo(() => `COT-${String((quotes?.length||0)+1).padStart(5,'0')}`, [quotes])

  return (
    <section className="clients-page fade-in">
      <div className="clients-head"><h1>Cotizaciones</h1></div>

      {/* ── TOOLBAR ── */}
      <div className="clients-main-card">
        <div className="clients-toolbar">
          <button type="button" className="clients-new-btn" onClick={openNew}>
            <span style={{fontSize:18, lineHeight:1}}>＋</span> Nueva Cotización
          </button>
          <div className="clients-search-wrap">
            <span className="clients-search-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
              </svg>
            </span>
            <input className="clients-search-input" placeholder="Buscar por cliente o producto..."
              value={query} onChange={e=>setQuery(e.target.value)} />
          </div>
        </div>

        {/* ── LISTA DE COTIZACIONES ── */}
        {filteredQuotes.length === 0 ? (
          <div className="clients-empty" style={{padding:'40px 0', textAlign:'center', color:'#9ca3af'}}>
            <div style={{fontSize:40, marginBottom:12}}>📋</div>
            <div style={{fontWeight:600, fontSize:15, color:'#374151'}}>No hay cotizaciones aún</div>
            <div style={{fontSize:13, marginTop:4}}>Crea una nueva cotización con el botón de arriba</div>
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            {filteredQuotes.map(qt => {
              const cl = clients.find(c => String(c.id) === String(qt.client_id||qt.clientId))
              const code = `COT-${String(qt.id).padStart(5,'0')}`
              const firstItem = qt.items?.[0]?.description || '—'
              const itemCount = qt.items?.length || 0
              const total = Number(qt.total||0)
              const dateStr = qt.created_at
                ? new Date(qt.created_at).toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'})
                : ''

              return (
                <div key={qt.id} className="quotes-saved-item">
                  <div className="quotes-saved-item-info">
                    <span className="q-code">{code}</span>
                    {dateStr && <span style={{fontSize:11,color:'#9ca3af',marginLeft:8}}>{dateStr}</span>}
                    <div className="q-client">{cl?.name || '—'}</div>
                    <div className="q-items">
                      {firstItem}{itemCount > 1 ? ` +${itemCount-1} más` : ''}
                    </div>
                    <div className="q-total">S/ {total.toFixed(2)}</div>
                  </div>
                  <div className="quotes-saved-item-actions">
                    <button type="button" className="btn-icon btn-icon-pdf" onClick={() => openEditor(qt)} title="Editar y exportar PDF">
                      📄
                    </button>
                    {canDelete && (
                      <button type="button" className="btn-icon btn-icon-delete"
                        onClick={() => { if(window.confirm(`¿Eliminar ${code}?`)) deleteQuote(qt.id) }}
                        title="Eliminar">🗑</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{marginTop:16, fontSize:13, color:'#9ca3af', textAlign:'right'}}>
          {filteredQuotes.length} cotización{filteredQuotes.length!==1?'es':''}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL NUEVA COTIZACIÓN
      ══════════════════════════════════════════════════ */}
      {newOpen && (
        <ModalPortal>
          <div className="ss-overlay" onClick={e => { if(e.target===e.currentTarget) setNewOpen(false) }}>
            <div className="ss-modal ss-modal-xl" style={{maxHeight:'92vh'}}>
            <div className="ss-modal-head">
              <div>
                <h3>＋ Nueva Cotización</h3>
                <p>{nextCode} · {new Date().toLocaleDateString('es-PE')}</p>
              </div>
              <button className="ss-modal-close" onClick={() => setNewOpen(false)}>✕</button>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', flex:1, minHeight:0}}>

              {/* ── IZQUIERDA: Buscar y agregar productos ── */}
              <div style={{padding:'22px', borderRight:'1px solid #f0f4fa', display:'flex', flexDirection:'column', gap:14, overflow:'hidden'}}>
                <div>
                  <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:'#4b5563', marginBottom:8}}>
                    CLIENTE
                  </div>
                  <StyledSelect
                    value={newClientId}
                    onChange={setNewClientId}
                    options={clientOptions}
                  />
                  {/* Datos del cliente seleccionado */}
                  {newClientId && (() => {
                    const cl = clients.find(c => String(c.id)===String(newClientId))
                    if (!cl) return null
                    return (
                      <div style={{marginTop:8, padding:'10px 12px', background:'#f6faff', borderRadius:10, fontSize:12, color:'#374151', lineHeight:1.8}}>
                        {cl.dni && <div>DNI: <strong>{cl.dni}</strong></div>}
                        {cl.ruc && <div>RUC: <strong>{cl.ruc}</strong></div>}
                        {cl.email && <div>Correo: {cl.email}</div>}
                        {cl.phone && <div>Teléfono: {cl.phone}</div>}
                        {cl.address && <div>Dirección: {[cl.address,cl.district,cl.city].filter(Boolean).join(', ')}</div>}
                      </div>
                    )
                  })()}
                </div>

                <div style={{flex:1, display:'flex', flexDirection:'column', gap:10, overflow:'hidden'}}>
                  <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:'#4b5563'}}>
                    BUSCAR PRODUCTOS
                  </div>
                  <div className="clients-search-wrap" style={{flex:'none'}}>
                    <span className="clients-search-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
                      </svg>
                    </span>
                    <input className="clients-search-input" placeholder="Nombre o SKU..." style={{fontSize:13}}
                      value={prodQuery} onChange={e=>setProdQuery(e.target.value)} />
                  </div>
                  <div className="product-search-list" style={{flex:1}}>
                    {filteredProds.length === 0 ? (
                      <div style={{color:'#9ca3af', textAlign:'center', padding:'20px 0', fontSize:13}}>Sin resultados</div>
                    ) : filteredProds.slice(0,20).map(p => (
                      <div key={p.id} className="product-item">
                        <div className="product-item-info">
                          <strong>{p.name}</strong>
                          <span>SKU: {p.sku||'—'} · Stock: {p.qty}</span>
                        </div>
                        <span className="product-item-price">S/ {Number(p.price||0).toFixed(2)}</span>
                        <button type="button" className="product-add-btn" onClick={() => addProd(p)}>+ Agregar</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── DERECHA: Carrito ── */}
              <div style={{padding:'22px', display:'flex', flexDirection:'column', gap:14}}>
                <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:'#4b5563'}}>
                  CARRITO ({newItems.length} producto{newItems.length!==1?'s':''})
                </div>

                <div className="quotes-cart-table-wrap" style={{flex:1, overflowY:'auto', maxHeight:320}}>
                  {newItems.length === 0 ? (
                    <div style={{padding:'40px 20px', textAlign:'center', color:'#9ca3af', fontSize:13}}>
                      <div style={{fontSize:32, marginBottom:8}}>🛒</div>
                      Agrega productos desde la izquierda
                    </div>
                  ) : (
                    <table className="quotes-cart-table">
                      <thead>
                        <tr>
                          <th style={{width:'40%'}}>Producto</th>
                          <th style={{textAlign:'center'}}>Cant.</th>
                          <th style={{textAlign:'right'}}>P.Unit</th>
                          <th style={{textAlign:'right'}}>Total</th>
                          <th style={{width:32}}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {newItems.map(it => (
                          <tr key={it.id}>
                            <td style={{fontSize:12, maxWidth:160}}>
                              <div style={{fontWeight:600, color:'#0b1220', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{it.description}</div>
                            </td>
                            <td style={{textAlign:'center'}}>
                              <QtyCtrl value={it.qty} onChange={v => setNewItems(p => p.map(x => x.id===it.id ? {...x,qty:v} : x))} />
                            </td>
                            <td style={{textAlign:'right', fontSize:12}}>S/ {it.price.toFixed(2)}</td>
                            <td style={{textAlign:'right', fontWeight:700, color:'#0b5ed7', fontSize:13}}>
                              S/ {(it.qty*it.price).toFixed(2)}
                            </td>
                            <td>
                              <button type="button" onClick={() => setNewItems(p => p.filter(x => x.id!==it.id))}
                                style={{all:'unset', cursor:'pointer', color:'#ef4444', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:6, background:'#fee2e2'}}>
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {newItems.length > 0 && (
                  <div className="quotes-total-bar">
                    <span>TOTAL</span>
                    <span>S/ {newTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="ss-modal-foot">
              <button type="button" className="ss-btn-cancel" onClick={() => setNewOpen(false)}>Cancelar</button>
              <button type="button" className="ss-btn-primary" onClick={saveNewQuote} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cotización'}
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL EDITOR / PDF
      ══════════════════════════════════════════════════ */}
      {edOpen && (
        <ModalPortal>
          <div className="ss-overlay" onClick={e => { if(e.target===e.currentTarget) setEdOpen(false) }}>
            <div className="ss-modal ss-modal-xl" style={{maxHeight:'92vh'}}>
            <div className="ss-modal-head">
              <div>
                <h3>Editor de Cotización</h3>
                <p>{edQuote?.id} · Edita antes de exportar PDF</p>
              </div>
              <button className="ss-modal-close" onClick={() => setEdOpen(false)}>✕</button>
            </div>

            <div className="ss-modal-body" style={{overflowY:'auto'}}>
              {/* Fila 1: cliente + nro + IGV */}
              <div className="ss-row-3">
                <div className="ss-field" style={{gridColumn:'span 1'}}>
                  <label>Cliente</label>
                  <StyledSelect
                    value={edClientId}
                    onChange={setEdClientId}
                    options={editorClientOptions}
                  />
                </div>
                <div className="ss-field">
                  <label>N° Cotización</label>
                  <input value={edQuote?.id||''} onChange={e=>setEdQuote(p=>({...p,id:e.target.value}))} />
                </div>
                <div className="ss-field">
                  <label>IGV</label>
                  <StyledSelect
                    value={String(edIgv)}
                    onChange={(nextValue) => setEdIgv(Number(nextValue))}
                    options={IGV_OPTIONS}
                  />
                </div>
              </div>

              {/* Info cliente */}
              {edClient && (
                <div style={{padding:'10px 14px', background:'#f6faff', borderRadius:10, fontSize:12, color:'#374151', lineHeight:1.9}}>
                  <strong style={{color:'#0b5ed7'}}>{edClient.name}</strong>
                  {edClient.dni && <span style={{marginLeft:12}}>DNI: {edClient.dni}</span>}
                  {edClient.ruc && <span style={{marginLeft:12}}>RUC: {edClient.ruc}</span>}
                  {edClient.email && <span style={{marginLeft:12}}>✉ {edClient.email}</span>}
                  {edClient.phone && <span style={{marginLeft:12}}>☎ {edClient.phone}</span>}
                </div>
              )}

              {/* Tabla de ítems editable */}
              <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                  <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:'#4b5563'}}>
                    PRODUCTOS
                  </div>
                  <button type="button" onClick={() => setEdItems(p=>[...p,{id:Date.now()+Math.random(),description:'',qty:1,price:0}])}
                    style={{padding:'6px 14px', background:'#eef4ff', color:'#0b5ed7', border:'1.5px solid #c0d4f7',
                      borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer'}}>
                    + Agregar fila
                  </button>
                </div>

                <div style={{border:'1.5px solid #e8eef8', borderRadius:12, overflow:'hidden'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                    <thead>
                      <tr style={{background:'linear-gradient(135deg,#0b5ed7,#1a7fd4)'}}>
                        <th style={{textAlign:'left', padding:'11px 14px', color:'#fff', fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.7px', width:'46%'}}>Descripción</th>
                        <th style={{textAlign:'center', padding:'11px 8px', color:'#fff', fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.7px', width:'12%'}}>Cant.</th>
                        <th style={{textAlign:'right', padding:'11px 14px', color:'#fff', fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.7px', width:'18%'}}>P. Unit.</th>
                        <th style={{textAlign:'right', padding:'11px 14px', color:'#fff', fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.7px', width:'18%'}}>Subtotal</th>
                        <th style={{width:40}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {edItems.map((it,idx) => (
                        <tr key={it.id} style={{background: idx%2===0?'#fff':'#f6faff', borderBottom:'1px solid #f0f4fa'}}>
                          <td style={{padding:'8px 10px'}}>
                            <input value={it.description} onChange={e=>chItem(it.id,'description',e.target.value)}
                              placeholder="Descripción..."
                              style={{width:'100%', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'7px 10px', fontSize:13, background:'#fafafa'}} />
                          </td>
                          <td style={{padding:'8px 6px', textAlign:'center'}}>
                            <input type="number" min={1} value={it.qty} onChange={e=>chItem(it.id,'qty',Math.max(1,Number(e.target.value)))}
                              style={{width:60, border:'1.5px solid #e5e7eb', borderRadius:8, padding:'7px 6px', textAlign:'center', fontSize:13}} />
                          </td>
                          <td style={{padding:'8px 6px'}}>
                            <input type="number" min={0} step="0.01" value={it.price} onChange={e=>chItem(it.id,'price',Number(e.target.value))}
                              style={{width:'100%', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'7px 10px', textAlign:'right', fontSize:13}} />
                          </td>
                          <td style={{padding:'8px 14px', textAlign:'right', fontWeight:700, color:'#0b5ed7', fontSize:14}}>
                            S/ {(it.qty*it.price).toFixed(2)}
                          </td>
                          <td style={{padding:'8px 6px', textAlign:'center'}}>
                            <button type="button" onClick={()=>setEdItems(p=>p.filter(x=>x.id!==it.id))}
                              className="btn-icon btn-icon-delete" style={{width:28,height:28,fontSize:13}}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totales */}
                <div style={{display:'flex', justifyContent:'flex-end', marginTop:14}}>
                  <div style={{width:260, border:'1.5px solid #e8eef8', borderRadius:12, overflow:'hidden', fontSize:13}}>
                    <div style={{display:'flex',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid #e8eef8'}}>
                      <span style={{color:'#6b7280'}}>Subtotal</span><span>S/ {edSubtotal.toFixed(2)}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid #e8eef8', color: edIgv?'#374151':'#9ca3af'}}>
                      <span>IGV ({edIgv}%)</span><span>S/ {edIgvAmt.toFixed(2)}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',padding:'14px 16px',
                      background:'linear-gradient(135deg,#0b5ed7,#1a7fd4)',color:'#fff',fontWeight:800,fontSize:15}}>
                      <span>TOTAL</span><span>S/ {edTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nota */}
              <div className="ss-field">
                <label>Condiciones / Nota al pie del PDF</label>
                <textarea rows={2} value={edNote} onChange={e=>setEdNote(e.target.value)}
                  style={{resize:'vertical', fontFamily:'inherit', lineHeight:1.5}} />
              </div>
            </div>

            <div className="ss-modal-foot">
              <button type="button" className="ss-btn-cancel" onClick={()=>setEdOpen(false)}>Cerrar</button>
              <button type="button" className="ss-btn-primary" onClick={exportPdf}>
                Exportar PDF
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  )
}
