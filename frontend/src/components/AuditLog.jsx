import React, { useState, useEffect, useMemo, useRef } from 'react'
import { apiFetch } from '../context/AppContext'
import StyledSelect from './StyledSelect'

const ACTION_LABELS = {
  LOGIN:     { label: 'Inicio de sesión',    color: '#10b981', bg:'#d1fae5' },
  LOGOUT:    { label: 'Cierre de sesión',    color: '#6b7280', bg:'#f3f4f6' },
  CREATE:    { label: 'Creación',            color: '#3b82f6', bg:'#dbeafe' },
  UPDATE:    { label: 'Edición',             color: '#f59e0b', bg:'#fef3c7' },
  DELETE:    { label: 'Eliminación',         color: '#ef4444', bg:'#fee2e2' },
  REVERT:    { label: 'Reversión de venta',  color: '#8b5cf6', bg:'#ede9fe' },
  STOCK_IN:  { label: 'Entrada almacén',     color: '#10b981', bg:'#d1fae5' },
  STOCK_OUT: { label: 'Salida almacén',      color: '#f59e0b', bg:'#fef3c7' },
}

const ENTITY_LABELS = {
  users:'Usuario', clients:'Cliente', inventory:'Inventario',
  sales:'Venta', quotes:'Cotización', quote:'Cotización', providers:'Proveedor',
  movements:'Movimiento', company:'Empresa', kits:'Kit',
}

const PER_PAGE = 25

const ACTION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  ...Object.entries(ACTION_LABELS).map(([value, item]) => ({ value, label: item.label }))
]

const ENTITY_OPTIONS = [
  { value: '', label: 'Todos los módulos' },
  { value: 'users',     label: 'Usuario' },
  { value: 'clients',   label: 'Cliente' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'sales',     label: 'Venta' },
  { value: 'quote',     label: 'Cotización' },
  { value: 'providers', label: 'Proveedor' },
  { value: 'movements', label: 'Movimiento' },
  { value: 'company',   label: 'Empresa' },
  { value: 'kits',      label: 'Kit' },
]

// ── Diccionario de claves técnicas → etiquetas legibles ───────────────────
const FIELD_LABELS = {
  name:'Nombre', username:'Usuario', role:'Rol', is_active:'Activo',
  email:'Correo', phone:'Teléfono', address:'Dirección',
  district:'Distrito', city:'Ciudad', dni:'DNI', ruc:'RUC',
  sku:'SKU', qty:'Cantidad', price:'Precio (S/)', total:'Total (S/)',
  subtotal:'Subtotal (S/)', discount:'Descuento', discount_type:'Tipo descuento',
  discount_reason:'Motivo descuento', igv:'IGV (%)', note:'Nota',
  description:'Descripción', contact:'Contacto',
  provider_id:'Proveedor', client_id:'Cliente',
  source_quote_id:'Cotización origen', date:'Fecha', items:'Productos',
  // claves enriquecidas desde backend
  cotizacion_id:'N° Cotización', venta_id:'N° Venta',
  cliente:'Cliente', total_soles:'Total', descuento:'Descuento aplicado',
  cotizacion_origen:'Cotización origen', productos:'Productos',
  nombre:'Nombre', descripcion:'Descripción',
  cantidad:'Cantidad', precio_unitario:'Precio unitario', proveedor:'Proveedor',
}

const HIDDEN_FIELDS = new Set(['id','created_at','updated_at','logo','logo_base64','password','hash'])

const humanValue = (key, val) => {
  if (val === null || val === undefined) return '—'
  if (key === 'is_active') return val ? 'Sí' : 'No'
  if (key === 'role') {
    const roles = { SUPERADMIN:'Super Administrador', ADMIN:'Administrador', SALES:'Ventas', WAREHOUSE:'Almacén' }
    return roles[val] || val
  }
  if (key === 'discount_type') return val === 'percent' ? 'Porcentaje (%)' : val === 'fixed' ? 'Monto fijo (S/)' : val
  if (key === 'client_id')   return `Cliente #${val} (registro histórico)`
  if (key === 'provider_id') return `Proveedor #${val} (registro histórico)`
  if (key === 'source_quote_id' && val) return `COT-${String(val).padStart(5,'0')}`
  if (Array.isArray(val)) {
    if (val.length === 0) return 'Sin ítems'
    return val.map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        const desc  = item.description || item.name || `Ítem ${i+1}`
        const qty   = item.qty ?? item.quantity ?? ''
        const price = item.unit_price ?? item.price ?? item.kit_price ?? ''
        const parts = [desc]
        if (qty   !== '') parts.push(`cant: ${qty}`)
        if (price !== '') parts.push(`S/ ${price}`)
        return parts.join(' · ')
      }
      return String(item)
    }).join('\n')
  }
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

// ── Fila expandible con detalle before/after ──────────────────────────────
function AuditRow({ log, ai, fmt, hasDetail }) {
  const [open, setOpen] = useState(false)

  const parseJSON = (val) => {
    if (!val) return null
    if (typeof val === 'object') return val
    try { return JSON.parse(val) } catch { return null }
  }

  const renderFields = (obj, label, color) => {
    if (!obj) return null
    const entries = Object.entries(obj).filter(([k,v]) =>
      !HIDDEN_FIELDS.has(k) && v !== null && v !== undefined && v !== ''
    )
    if (!entries.length) return null
    return (
      <div style={{flex:1,minWidth:200}}>
        <div style={{fontSize:'10px',fontWeight:700,color,marginBottom:'8px',
          textTransform:'uppercase',letterSpacing:'0.06em',display:'flex',alignItems:'center',gap:'5px'}}>
          <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:color}}/>
          {label}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
          {entries.map(([k,v]) => {
            const humanVal = humanValue(k, v)
            const isMultiline = humanVal.includes('\n')
            return (
              <div key={k} style={{display:'flex',gap:'8px',fontSize:'11px',alignItems:'flex-start',
                background:'#f9fafb',borderRadius:'5px',padding:'4px 8px'}}>
                <span style={{color:'#6b7280',fontWeight:600,minWidth:'120px',flexShrink:0}}>
                  {FIELD_LABELS[k] || k}
                </span>
                {isMultiline ? (
                  <div style={{color:'#111827',display:'flex',flexDirection:'column',gap:'2px'}}>
                    {humanVal.split('\n').map((line, i) => (
                      <span key={i} style={{
                        background:'#e5e7eb',borderRadius:'4px',padding:'2px 6px',
                        display:'inline-block',fontSize:'10.5px'
                      }}>{line}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{color:'#111827',wordBreak:'break-all'}}>{humanVal}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderDiff = (before, after) => {
    if (!before || !after) return null
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)].filter(k => !HIDDEN_FIELDS.has(k)))
    const changed = [...allKeys].filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    if (changed.length === 0) return (
      <span style={{fontSize:'12px',color:'#9ca3af',padding:'8px'}}>Sin cambios detectados</span>
    )
    return (
      <div style={{width:'100%'}}>
        <div style={{fontSize:'10px',fontWeight:700,color:'#6b7280',marginBottom:'8px',
          textTransform:'uppercase',letterSpacing:'0.06em'}}>
          Campos modificados
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          {changed.map(k => (
            <div key={k} style={{display:'grid',gridTemplateColumns:'120px 1fr auto 1fr',
              gap:'8px',fontSize:'11px',alignItems:'center',
              background:'#f9fafb',borderRadius:'6px',padding:'5px 10px'}}>
              <span style={{color:'#6b7280',fontWeight:600}}>{FIELD_LABELS[k] || k}</span>
              <span style={{background:'#fee2e2',color:'#991b1b',padding:'2px 8px',
                borderRadius:'4px',wordBreak:'break-all',textDecoration:'line-through',opacity:0.85}}>
                {humanValue(k, before[k])}
              </span>
              <span style={{color:'#9ca3af',fontWeight:700,fontSize:'13px'}}>→</span>
              <span style={{background:'#dcfce7',color:'#166534',padding:'2px 8px',
                borderRadius:'4px',wordBreak:'break-all',fontWeight:600}}>
                {humanValue(k, after[k])}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const before = parseJSON(log.before_json)
  const after  = parseJSON(log.after_json)
  const isEdit = before && after

  return (
    <>
      <tr>
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
            {ai.label}
          </span>
        </td>
        <td style={{fontSize:'13px'}}>{ENTITY_LABELS[log.entity]||log.entity||'—'}</td>
        <td>
          {hasDetail ? (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              style={{
                background:'none',border:'1px solid #e5e7eb',borderRadius:'6px',
                padding:'3px 8px',fontSize:'11px',cursor:'pointer',
                color: open ? '#3b82f6' : '#6b7280',
                display:'inline-flex',alignItems:'center',gap:'4px'
              }}
            >
              {open ? '▲' : '▼'} {open ? 'Ocultar' : 'Ver'}
            </button>
          ) : (
            <span style={{fontSize:'11px',color:'#d1d5db'}}>—</span>
          )}
        </td>
      </tr>
      {open && hasDetail && (
        <tr>
          <td colSpan={5} style={{padding:'0',background:'#f9fafb',borderTop:'none'}}>
            <div style={{
              padding:'12px 16px',borderLeft:'3px solid '+ai.color,
              margin:'0 4px 4px',borderRadius:'0 6px 6px 0',
              background:'#fff',display:'flex',gap:'24px',flexWrap:'wrap'
            }}>
              {isEdit
                ? renderDiff(before, after)
                : <>
                    {before && renderFields(before, 'Datos eliminados / antes', '#ef4444')}
                    {before && after && <div style={{width:'1px',background:'#e5e7eb',alignSelf:'stretch'}} />}
                    {after  && renderFields(after,  'Datos registrados', '#10b981')}
                  </>
              }
              {!before && !after && (
                <span style={{fontSize:'12px',color:'#9ca3af'}}>Sin datos adicionales</span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AuditLog() {
  const [logs,         setLogs]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [query,        setQuery]        = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [page,         setPage]         = useState(1)
  const tableScrollRef = useRef(null)
  const tableTouchRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, dragging: false })

  useEffect(() => { fetchLogs() }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const r = await apiFetch('/audit')
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
      // Normaliza tildes: "cotización" = "cotizacion", "sesión" = "sesion"
      const norm = (s) => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      const qn = norm(q)
      const entityLabel = (e) => norm(ENTITY_LABELS[e] || e || '')
      const actionLabel = (a) => norm((ACTION_LABELS[a]?.label) || a || '')
      r = r.filter(l =>
        norm(l.user_name).includes(qn) ||
        norm(l.username).includes(qn) ||
        norm(l.action).includes(qn) ||
        norm(l.entity).includes(qn) ||
        entityLabel(l.entity).includes(qn) ||
        actionLabel(l.action).includes(qn)
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

  useEffect(() => {
    const wrapper = tableScrollRef.current
    if (!wrapper) return
    const onTouchStart = (e) => {
      if (!e.touches?.length) return
      const t = e.touches[0]
      tableTouchRef.current = { startX: t.clientX, startY: t.clientY, scrollLeft: wrapper.scrollLeft, dragging: false, blocked: false }
    }
    const onTouchMove = (e) => {
      const ref = tableTouchRef.current
      if (!e.touches?.length || ref.blocked) return
      const t = e.touches[0]
      const dx = t.clientX - ref.startX
      const dy = t.clientY - ref.startY
      if (!ref.dragging) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        if (Math.abs(dy) >= Math.abs(dx)) { ref.blocked = true; return }
        ref.dragging = true
      }
      e.preventDefault()
      wrapper.scrollLeft = ref.scrollLeft - dx
    }
    wrapper.addEventListener('touchstart', onTouchStart, { passive: true })
    wrapper.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      wrapper.removeEventListener('touchstart', onTouchStart)
      wrapper.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

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
        <div className="clients-toolbar audit-toolbar">
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

          <button type="button" className="clients-new-btn" onClick={fetchLogs}>
            Actualizar
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
                {count} {v.label}
              </span>
            )
          })}
        </div>

        {/* TABLE */}
        <div
          className="clients-table-wrap audit-table-wrap"
          ref={tableScrollRef}
        >
          {loading ? (
            <div className="clients-empty">Cargando registros...</div>
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
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(log => {
                  const ai = ACTION_LABELS[log.action] || {label:log.action, color:'#6b7280', bg:'#f3f4f6'}
                  const hasDetail = log.before_json || log.after_json
                  return (
                    <AuditRow key={log.id} log={log} ai={ai} fmt={fmt} hasDetail={hasDetail} />
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
      </div>
    </section>
  )
}
