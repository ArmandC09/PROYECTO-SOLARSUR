import React, { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '../context/AppContext'
import StyledSelect from './StyledSelect'

const ACTION_LABELS = {
  LOGIN:     { label: 'Inicio de sesión', color: '#10b981', bg:'#d1fae5', icon: '🔐' },
  LOGOUT:    { label: 'Cierre de sesión', color: '#6b7280', bg:'#f3f4f6', icon: '🚪' },
  CREATE:    { label: 'Creación',         color: '#3b82f6', bg:'#dbeafe', icon: '✅' },
  UPDATE:    { label: 'Edición',          color: '#f59e0b', bg:'#fef3c7', icon: '✏️' },
  DELETE:    { label: 'Eliminación',      color: '#ef4444', bg:'#fee2e2', icon: '🗑️' },
  STOCK_IN:  { label: 'Entrada almacén', color: '#10b981', bg:'#d1fae5', icon: '📦' },
  STOCK_OUT: { label: 'Salida almacén',  color: '#f59e0b', bg:'#fef3c7', icon: '📤' },
  RESTORE:   { label: 'Restauración',    color: '#8b5cf6', bg:'#ede9fe', icon: '↩️' },
}

const ENTITY_LABELS = {
  users:'Usuario', clients:'Cliente', inventory:'Inventario',
  sales:'Venta', quotes:'Cotización', providers:'Proveedor',
  movements:'Movimiento', company:'Empresa',
}

const PER_PAGE = 25

const ACTION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  ...Object.entries(ACTION_LABELS).map(([value, item]) => ({ value, label: `${item.icon} ${item.label}` }))
]

const ENTITY_OPTIONS = [
  { value: '', label: 'Todos los módulos' },
  ...Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label }))
]

export default function AuditLog() {
  const [logs,         setLogs]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [query,        setQuery]        = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [page,         setPage]         = useState(1)

  useEffect(() => { fetchLogs() }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const r = await apiFetch('/audit?limit=500')
      if (r.ok) setLogs(await r.json())
      else console.warn('Audit fetch failed:', r.status)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    let r = logs
    if (filterAction) r = r.filter(l => l.action === filterAction)
    if (filterEntity) r = r.filter(l => l.entity === filterEntity)
    if (query.trim()) {
      const q = query.toLowerCase()
      r = r.filter(l =>
        (l.user_name||'').toLowerCase().includes(q) ||
        (l.username||'').toLowerCase().includes(q) ||
        (l.action||'').toLowerCase().includes(q) ||
        (l.entity||'').toLowerCase().includes(q)
      )
    }
    return r
  }, [logs, query, filterAction, filterEntity])

  useEffect(() => { setPage(1) }, [query, filterAction, filterEntity])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage-1)*PER_PAGE, safePage*PER_PAGE)

  const fmt = (dt) => {
    if (!dt) return '—'
    const d = new Date(dt)
    return d.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'}) + ' ' +
           d.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
  }

  return (
    <section className="clients-page fade-in">
      <div className="clients-head">
        <h1>Registro de Auditoría</h1>
        <p style={{color:'#6b7280',fontSize:'14px',marginTop:'4px'}}>
          Historial completo de acciones del sistema
        </p>
      </div>

      <div className="clients-main-card" style={{marginTop:'16px'}}>
        {/* TOOLBAR */}
        <div className="clients-toolbar" style={{flexWrap:'wrap',gap:'10px'}}>
          <div className="clients-search-wrap">
            <span className="clients-search-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
              </svg>
            </span>
            <input className="clients-search-input" placeholder="Buscar usuario, acción..." value={query} onChange={e=>setQuery(e.target.value)}/>
          </div>

          <StyledSelect
            value={filterAction}
            onChange={setFilterAction}
            options={ACTION_OPTIONS}
            className="styled-select-inline"
            triggerClassName="styled-select-toolbar-trigger"
          />

          <StyledSelect
            value={filterEntity}
            onChange={setFilterEntity}
            options={ENTITY_OPTIONS}
            className="styled-select-inline"
            triggerClassName="styled-select-toolbar-trigger"
          />

          <button type="button" className="clients-new-btn" onClick={fetchLogs} style={{marginLeft:'auto'}}>
            🔄 Actualizar
          </button>
        </div>

        {/* STATS */}
        <div style={{display:'flex',gap:'8px',padding:'12px 0',flexWrap:'wrap'}}>
          {Object.entries(ACTION_LABELS).map(([k,v])=>{
            const count = logs.filter(l=>l.action===k).length
            if (!count) return null
            return (
              <span key={k} style={{
                display:'inline-flex',alignItems:'center',gap:'5px',
                background:v.bg,color:v.color,fontWeight:700,fontSize:'12px',
                padding:'4px 12px',borderRadius:'99px',border:`1px solid ${v.color}30`
              }}>
                {v.icon} {count} {v.label}
              </span>
            )
          })}
        </div>

        {/* TABLE */}
        <div className="clients-table-wrap">
          {loading ? (
            <div className="clients-empty">⏳ Cargando registros...</div>
          ) : paginated.length === 0 ? (
            <div className="clients-empty">No hay registros de auditoría.</div>
          ) : (
            <table className="data-table audit-table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Módulo</th>
                  <th>ID</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(log => {
                  const ai = ACTION_LABELS[log.action] || {label:log.action, color:'#6b7280', bg:'#f3f4f6', icon:'•'}
                  return (
                    <tr key={log.id}>
                      <td style={{fontSize:'12px',color:'#6b7280',whiteSpace:'nowrap'}}>{fmt(log.created_at)}</td>
                      <td>
                        <strong style={{display:'block'}}>{log.user_name||'—'}</strong>
                        {log.username && <span style={{fontSize:'11px',color:'#9ca3af'}}>@{log.username}</span>}
                      </td>
                      <td>
                        <span style={{
                          display:'inline-flex',alignItems:'center',gap:'4px',
                          background:ai.bg,color:ai.color,fontWeight:700,fontSize:'11px',
                          padding:'3px 10px',borderRadius:'99px',border:`1px solid ${ai.color}30`
                        }}>
                          {ai.icon} {ai.label}
                        </span>
                      </td>
                      <td style={{fontSize:'13px'}}>{ENTITY_LABELS[log.entity]||log.entity||'—'}</td>
                      <td style={{fontSize:'12px',color:'#9ca3af'}}>{log.entity_id?`#${log.entity_id}`:'—'}</td>
                      <td style={{fontSize:'11px',color:'#9ca3af'}}>{log.ip||'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        <div className="clients-pagination">
          <div className="clients-pagination-info">
            {filtered.length===0 ? 'Sin registros' : `Mostrando ${(safePage-1)*PER_PAGE+1}–${Math.min(safePage*PER_PAGE,filtered.length)} de ${filtered.length}`}
          </div>
          <div className="clients-pagination-controls">
            <button type="button" className="clients-page-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage===1}>‹</button>
            {Array.from({length:Math.min(totalPages,8)},(_,i)=>i+1).map(p=>(
              <button key={p} type="button" className={`clients-page-number ${p===safePage?'active':''}`} onClick={()=>setPage(p)}>{p}</button>
            ))}
            <button type="button" className="clients-page-next" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages}>Siguiente ›</button>
          </div>
        </div>
      </div>
    </section>
  )
}
