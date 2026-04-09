import React, { useState, useContext, useMemo } from 'react'
import AppContext from '../context/AppContext'
import AuthContext from '../context/AuthContext'
import ModalPortal from './ModalPortal'

const ITEMS_PER_PAGE = 10

export default function Clients() {
  const { clients, addClient, updateClient, deleteClient } = useContext(AppContext)
  const { user } = useContext(AuthContext)

  const canEdit = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN'

  const emptyForm = { name: '', phone: '', address: '', dni: '', ruc: '', email: '', district: '', city: '' }
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState(false)

  const hasOptionalData = (clientForm) => Boolean(
    clientForm.dni || clientForm.ruc || clientForm.email || clientForm.district || clientForm.city
  )

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowOptionalFields(false)
    setShowForm(false)
  }

  const openNewForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowOptionalFields(false)
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    if (editingId) await updateClient(editingId, form)
    else await addClient(form)
    setSaving(false)
    resetForm()
  }

  const startEdit = (c) => {
    const nextForm = { name: c.name||'', phone: c.phone||'', address: c.address||'', dni: c.dni||'', ruc: c.ruc||'', email: c.email||'', district: c.district||'', city: c.city||'' }
    setEditingId(c.id)
    setForm(nextForm)
    setShowOptionalFields(hasOptionalData(nextForm))
    setShowForm(true)
  }

  const filtered = useMemo(() => {
    if (!query) return clients
    const q = query.toLowerCase()
    return clients.filter(c =>
      (c.name||'').toLowerCase().includes(q) ||
      (c.phone||'').toLowerCase().includes(q) ||
      (c.address||'').toLowerCase().includes(q) ||
      (c.dni||'').toLowerCase().includes(q) ||
      (c.ruc||'').toLowerCase().includes(q) ||
      (c.email||'').toLowerCase().includes(q)
    )
  }, [clients, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE
  const paginatedClients = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  const from = filtered.length === 0 ? 0 : startIndex + 1
  const to = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)

  React.useEffect(() => { setPage(1) }, [query])

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <section className="clients-page fade-in">
      <div className="clients-head"><h1>Clientes</h1></div>

      <div className="clients-main-card">
        <div className="clients-toolbar">
          {canEdit && (
            <button type="button" className="clients-new-btn" onClick={openNewForm}>
              <span className="clients-plus">＋</span> Nuevo Cliente
            </button>
          )}
          <div className="clients-search-wrap">
            <span className="clients-search-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
              </svg>
            </span>
            <input className="clients-search-input" placeholder="Buscar por nombre, DNI, RUC, teléfono..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="clients-table-wrap">
          {paginatedClients.length === 0 ? (
            <div className="clients-empty">No hay clientes registrados.</div>
          ) : (
            <table className="data-table clients-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>DNI / RUC</th>
                  <th>Contacto</th>
                  <th>Ubicación</th>
                  {canEdit && <th style={{textAlign:'right'}}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong style={{color:'#0b1220'}}>{c.name}</strong>
                      {c.email && <div style={{fontSize:'12px',color:'#6b7280',marginTop:'2px'}}>✉ {c.email}</div>}
                    </td>
                    <td>
                      {c.dni && <div style={{fontSize:'13px'}}><span style={{fontSize:'10px',color:'#9ca3af',fontWeight:700}}>DNI</span> {c.dni}</div>}
                      {c.ruc && <div style={{fontSize:'13px'}}><span style={{fontSize:'10px',color:'#9ca3af',fontWeight:700}}>RUC</span> {c.ruc}</div>}
                      {!c.dni && !c.ruc && <span style={{color:'#d1d5db'}}>—</span>}
                    </td>
                    <td>
                      {c.phone && <div style={{fontSize:'13px'}}>📞 {c.phone}</div>}
                      {!c.phone && <span style={{color:'#d1d5db'}}>—</span>}
                    </td>
                    <td style={{fontSize:'13px',color:'#374151'}}>
                      {c.address && <div>{c.address}</div>}
                      {(c.district||c.city) && <div style={{color:'#6b7280'}}>{[c.district,c.city].filter(Boolean).join(', ')}</div>}
                      {!c.address && !c.district && !c.city && <span style={{color:'#d1d5db'}}>—</span>}
                    </td>
                    {canEdit && (
                      <td style={{textAlign:'right'}}>
                        <button type="button" className="btn-icon btn-icon-edit" onClick={() => startEdit(c)} title="Editar">✎</button>
                        <button type="button" className="btn-icon btn-icon-delete" onClick={() => { if(window.confirm('¿Eliminar cliente?')) deleteClient(c.id) }} title="Eliminar">🗑</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="clients-pagination">
          <div className="clients-pagination-info">Mostrando {from}–{to} de {filtered.length} clientes</div>
          <div className="clients-pagination-controls">
            <button type="button" className="clients-page-btn" onClick={() => setPage(p=>Math.max(1,p-1))} disabled={safePage===1}>‹</button>
            {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
              <button key={p} type="button" className={`clients-page-number ${p===safePage?'active':''}`} onClick={()=>setPage(p)}>{p}</button>
            ))}
            <button type="button" className="clients-page-next" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages}>Siguiente ›</button>
          </div>
        </div>
      </div>

      {/* ── MODAL FORM ── */}
      {showForm && canEdit && (
        <ModalPortal>
          <div className="ss-overlay" onClick={e => { if(e.target===e.currentTarget) resetForm() }}>
            <div className="ss-modal ss-modal-wide clients-form-modal">
              <div className="ss-modal-head">
                <h3>{editingId ? '✎ Editar Cliente' : '＋ Nuevo Cliente'}</h3>
                <button className="ss-modal-close" onClick={resetForm}>✕</button>
              </div>

              <form onSubmit={submit}>
                <div className="ss-modal-body clients-form-modal-body">
                  <div className="ss-field">
                    <label>Nombre *</label>
                    <input value={form.name} onChange={e=>f('name',e.target.value)} required placeholder="Nombre completo o razón social" />
                  </div>

                  <div className="ss-field">
                    <label>Teléfono</label>
                    <input value={form.phone} onChange={e=>f('phone',e.target.value)} placeholder="+51 999 888 777" />
                  </div>

                  <div className="ss-field">
                    <label>Dirección</label>
                    <input value={form.address} onChange={e=>f('address',e.target.value)} placeholder="Av. Ejemplo 123" />
                  </div>

                  <div className="clients-optional-toggle">
                    <div>
                      <strong>Datos fiscales y adicionales</strong>
                      <p>Opcional. Actívalo sólo si el cliente desea registrar DNI, RUC, correo o ubicación.</p>
                    </div>

                    <button
                      type="button"
                      className={`clients-switch ${showOptionalFields ? 'active' : ''}`}
                      onClick={() => setShowOptionalFields((prev) => !prev)}
                      aria-pressed={showOptionalFields}
                    >
                      <span className="clients-switch-track">
                        <span className="clients-switch-thumb" />
                      </span>
                      <span className="clients-switch-label">{showOptionalFields ? 'Activado' : 'Oculto'}</span>
                    </button>
                  </div>

                  {showOptionalFields && (
                    <>
                      <div className="ss-row-2">
                        <div className="ss-field">
                          <label>DNI</label>
                          <input value={form.dni} maxLength={8} onChange={e=>f('dni',e.target.value)} placeholder="12345678" />
                        </div>
                        <div className="ss-field">
                          <label>RUC</label>
                          <input value={form.ruc} maxLength={11} onChange={e=>f('ruc',e.target.value)} placeholder="20123456789" />
                        </div>
                      </div>

                      <div className="ss-field">
                        <label>Email</label>
                        <input type="email" value={form.email} onChange={e=>f('email',e.target.value)} placeholder="correo@ejemplo.com" />
                      </div>

                      <div className="ss-row-2">
                        <div className="ss-field">
                          <label>Distrito</label>
                          <input value={form.district} onChange={e=>f('district',e.target.value)} placeholder="Tacna" />
                        </div>
                        <div className="ss-field">
                          <label>Ciudad / Provincia</label>
                          <input value={form.city} onChange={e=>f('city',e.target.value)} placeholder="Tacna" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="ss-modal-foot">
                  <button type="button" className="ss-btn-cancel" onClick={resetForm}>Cancelar</button>
                  <button type="submit" className="ss-btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear cliente'}
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
