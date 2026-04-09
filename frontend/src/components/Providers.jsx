import React, { useMemo, useState, useContext } from 'react'
import AppContext from '../context/AppContext'
import ModalPortal from './ModalPortal'

export default function Providers() {
  const { providers, addProvider, updateProvider, deleteProvider } =
    useContext(AppContext)

  const [form, setForm] = useState({ name: '', contact: '', phone: '' })
  const [editingId, setEditingId] = useState(null)
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)

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
    const q = query.toLowerCase()
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.contact || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    )
  }), [providers, query])

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
          <div className="clients-table-wrap">
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
                {filtered.map((p) => (
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
                    />
                  </div>

                  <div className="ss-field">
                    <label>Contacto</label>
                    <input
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                      placeholder="Nombre de contacto"
                    />
                  </div>

                  <div className="ss-field">
                    <label>Teléfono</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="999 888 777"
                    />
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