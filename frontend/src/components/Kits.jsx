import React, { useState, useContext, useMemo } from 'react'
import AppContext from '../context/AppContext'
import ModalPortal from './ModalPortal'

export default function Kits() {
  const { kits, inventory, addKit, updateKit, deleteKit } = useContext(AppContext)

  const [search, setSearch]         = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [prodSearch, setProdSearch] = useState('')
  const [saving, setSaving]         = useState(false)

  const emptyForm = { name: '', description: '', items: [] }
  const [form, setForm] = useState(emptyForm)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return (kits || []).filter(k => k.name.toLowerCase().includes(q))
  }, [kits, search])

  const openNew = () => {
    setEditing(null); setForm(emptyForm); setProdSearch(''); setModalOpen(true)
  }

  const openEdit = (kit) => {
    setEditing(kit)
    setForm({
      name: kit.name,
      description: kit.description || '',
      items: (kit.items || []).map(it => ({
        product_id: it.product_id,
        product_name: it.product_name,
        sku: it.sku,
        stock: it.stock,
        qty: Number(it.qty),
        kit_price: Number(it.kit_price)
      }))
    })
    setProdSearch(''); setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setEditing(null) }

  const availableProducts = useMemo(() => {
    const inKit = new Set(form.items.map(i => i.product_id))
    const q = prodSearch.toLowerCase()
    return (inventory || []).filter(p =>
      !inKit.has(p.id) &&
      ((p.name||'').toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q))
    )
  }, [inventory, form.items, prodSearch])

  const addProduct = (prod) => {
    setForm(f => ({
      ...f,
      items: [...f.items, {
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku || '',
        stock: prod.stock,
        qty: 1,
        kit_price: Number(prod.price) || 0
      }]
    }))
    setProdSearch('')
  }

  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  const updateItem = (idx, field, val) =>
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) }))

  const kitTotal = form.items.reduce((s, it) => s + (Number(it.kit_price) * Number(it.qty)), 0)

  const handleSave = async () => {
    if (!form.name.trim()) { alert('El kit debe tener un nombre'); return }
    if (form.items.length === 0) { alert('Agrega al menos un producto al kit'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      items: form.items.map(it => ({
        product_id: it.product_id,
        qty: Number(it.qty),
        kit_price: Number(it.kit_price)
      }))
    }
    if (editing) await updateKit(editing.id, payload)
    else await addKit(payload)
    setSaving(false)
    closeModal()
  }

  const handleDelete = async (kit) => {
    if (!confirm(`¿Eliminar el kit "${kit.name}"?`)) return
    await deleteKit(kit.id)
  }

  return (
    <section className="clients-page fade-in">
      <div className="clients-head">
        <h1>Kits</h1>
        <button className="ss-btn-primary" onClick={openNew}>+ Nuevo kit</button>
      </div>

      {/* Buscador */}
      <div className="clients-search-wrap" style={{marginBottom:18}}>
        <span className="clients-search-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
          </svg>
        </span>
        <input className="clients-search-input" placeholder="Buscar kit..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Lista de kits */}
      {filtered.length === 0 ? (
        <div style={{textAlign:'center', padding:'60px 0', color:'#9ca3af', fontSize:14}}>
          {(kits||[]).length === 0 ? 'No hay kits creados aún. Crea el primero.' : 'Sin resultados'}
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {filtered.map(kit => (
            <div key={kit.id} className="card" style={{padding:'16px 20px', margin:0}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:6}}>
                    <span style={{fontWeight:700, fontSize:15, color:'#0b1220'}}>{kit.name}</span>
                    <span style={{
                      padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700,
                      background: kit.available ? '#dcfce7' : '#fee2e2',
                      color: kit.available ? '#166534' : '#991b1b'
                    }}>
                      {kit.available ? '✓ Disponible' : '✗ Sin stock'}
                    </span>
                  </div>
                  {kit.description && (
                    <div style={{fontSize:12, color:'#6b7280', marginBottom:8}}>{kit.description}</div>
                  )}
                  <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                    {(kit.items || []).map(it => (
                      <span key={it.id} style={{
                        fontSize:11, padding:'3px 8px', borderRadius:6,
                        background: Number(it.stock) >= Number(it.qty) ? '#f0f9ff' : '#fef2f2',
                        color: Number(it.stock) >= Number(it.qty) ? '#0369a1' : '#dc2626',
                        border: `1px solid ${Number(it.stock) >= Number(it.qty) ? '#bae6fd' : '#fecaca'}`
                      }}>
                        {it.product_name} ×{it.qty}
                        {Number(it.stock) < Number(it.qty) && ` (stock: ${it.stock})`}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{textAlign:'right', flexShrink:0}}>
                  <div style={{fontSize:18, fontWeight:800, color:'#0b4ea6', marginBottom:10}}>
                    S/ {Number(kit.total || 0).toFixed(2)}
                  </div>
                  <div style={{display:'flex', gap:6, justifyContent:'flex-end'}}>
                    <button className="ss-btn-cancel" style={{padding:'6px 14px', fontSize:12}} onClick={() => openEdit(kit)}>
                      Editar
                    </button>
                    <button className="ss-btn-danger" style={{padding:'6px 14px', fontSize:12}} onClick={() => handleDelete(kit)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <ModalPortal>
          <div className="ss-overlay" onClick={closeModal}>
            <div className="ss-modal ss-modal-wide" style={{maxWidth:820}} onClick={e => e.stopPropagation()}>
              <div className="ss-modal-head">
                <h2>{editing ? `Editar: ${editing.name}` : 'Nuevo kit'}</h2>
                <button className="ss-modal-close" onClick={closeModal}>×</button>
              </div>

              <div className="ss-modal-body" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>

                {/* Columna izquierda */}
                <div style={{display:'flex', flexDirection:'column', gap:14}}>
                  <div className="ss-field">
                    <label>Nombre del kit *</label>
                    <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Ej: Terma Solar 200L" />
                  </div>
                  <div className="ss-field">
                    <label>Descripción <span style={{fontWeight:400, color:'#9ca3af', fontSize:12}}>(opcional)</span></label>
                    <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Descripción breve del kit" />
                  </div>
                  <div className="ss-field">
                    <label>Buscar producto para agregar</label>
                    <div className="clients-search-wrap" style={{marginBottom:0}}>
                      <span className="clients-search-icon">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
                        </svg>
                      </span>
                      <input className="clients-search-input" placeholder="Nombre o SKU..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} style={{fontSize:13}} />
                    </div>
                  </div>
                  <div className="product-search-list" style={{flex:'none', maxHeight:240}}>
                    {availableProducts.length === 0 ? (
                      <div style={{color:'#9ca3af', textAlign:'center', padding:'20px 0', fontSize:12}}>
                        {prodSearch ? 'Sin resultados' : 'Escribe para buscar productos'}
                      </div>
                    ) : availableProducts.slice(0, 15).map(prod => (
                      <div key={prod.id} className="product-item">
                        <div className="product-item-info">
                          <strong>{prod.name}</strong>
                          <span>SKU: {prod.sku||'—'} · Stock: {prod.stock}</span>
                        </div>
                        <span className="product-item-price">S/ {Number(prod.price||0).toFixed(2)}</span>
                        <button type="button" className="product-add-btn" onClick={() => addProduct(prod)}>+ Agregar</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Columna derecha: componentes del kit */}
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  <div style={{fontWeight:700, fontSize:13, color:'#374151'}}>
                    Componentes del kit ({form.items.length})
                  </div>

                  {form.items.length === 0 ? (
                    <div style={{
                      textAlign:'center', color:'#9ca3af', fontSize:12,
                      padding:'40px 20px', border:'2px dashed #e2e8f0', borderRadius:12
                    }}>
                      Agrega productos desde la izquierda
                    </div>
                  ) : (
                    <div style={{display:'flex', flexDirection:'column', gap:8, maxHeight:360, overflowY:'auto'}}>
                      {form.items.map((it, idx) => (
                        <div key={idx} style={{
                          padding:'10px 12px', borderRadius:10,
                          background:'#f7faff', border:'1px solid #dde8f8'
                        }}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                            <span style={{fontWeight:600, fontSize:13, color:'#0b1220'}}>{it.product_name}</span>
                            <button onClick={() => removeItem(idx)} style={{
                              background:'none', border:'none', color:'#dc2626',
                              cursor:'pointer', fontSize:18, fontWeight:700, lineHeight:1, padding:0
                            }}>×</button>
                          </div>
                          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                            <div className="ss-field" style={{margin:0}}>
                              <label style={{fontSize:11}}>Cantidad</label>
                              <input type="number" min="1" step="1"
                                value={it.qty}
                                onChange={e => updateItem(idx, 'qty', e.target.value)}
                                style={{padding:'6px 8px', fontSize:13}} />
                            </div>
                            <div className="ss-field" style={{margin:0}}>
                              <label style={{fontSize:11}}>Precio en kit (S/)</label>
                              <input type="number" min="0" step="0.01"
                                value={it.kit_price}
                                onChange={e => updateItem(idx, 'kit_price', e.target.value)}
                                style={{padding:'6px 8px', fontSize:13}} />
                            </div>
                          </div>
                          <div style={{fontSize:11, color:'#6b7280', marginTop:5}}>
                            Stock: {it.stock} · Subtotal: S/ {(Number(it.qty) * Number(it.kit_price)).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {form.items.length > 0 && (
                    <div style={{
                      padding:'12px 16px', borderRadius:10, marginTop:'auto',
                      background:'linear-gradient(135deg,#0a3d8f,#1a7fd4)',
                      color:'#fff', textAlign:'right'
                    }}>
                      <span style={{fontSize:13, opacity:0.8}}>Total del kit: </span>
                      <span style={{fontSize:18, fontWeight:800}}>S/ {kitTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="ss-modal-foot">
                <button className="ss-btn-cancel" onClick={closeModal}>Cancelar</button>
                <button className="ss-btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear kit'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  )
}
