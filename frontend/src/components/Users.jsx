import React, { useEffect, useMemo, useState } from 'react'

const API = 'https://proyecto-solarsur.onrender.com/api'

function getToken() {
  return sessionStorage.getItem('solarsur_token') || ''
}

async function apiFetch(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
  return res
}

const ROLE_LABEL = {
  SUPERADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  SALES: 'Vendedor',
  WAREHOUSE: 'Almacén'
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({
    username: '',
    name: '',
    role: 'SALES',
    password: ''
  })

  const USERS_PER_PAGE = 5

  const resetForm = () => {
    setEditingId(null)
    setForm({
      username: '',
      name: '',
      role: 'SALES',
      password: ''
    })
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/users')
      if (!res.ok) {
        const t = await res.text()
        throw new Error(`Error ${res.status}: ${t}`)
      }
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      alert('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      String(u.username || '').toLowerCase().includes(q) ||
      String(u.name || '').toLowerCase().includes(q) ||
      String(u.role || '').toLowerCase().includes(q)
    )
  }, [users, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / USERS_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [currentPage, totalPages])

  const paginatedUsers = filtered.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  )

  const startEdit = (u) => {
    setEditingId(u.id)
    setForm({
      username: u.username || '',
      name: u.name || '',
      role: u.role || 'SALES',
      password: ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitUser = async (e) => {
    e.preventDefault()

    try {
      const payload = {
        username: form.username.trim(),
        name: form.name.trim(),
        role: form.role
      }

      if (!editingId) {
        payload.password = form.password
      } else if (form.password.trim()) {
        payload.password = form.password
      }

      let res

      if (editingId) {
        res = await apiFetch(`/users/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        res = await apiFetch('/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(data.message || `Error ${res.status}`)
        return
      }

      await load()
      resetForm()
      alert(editingId ? 'Usuario actualizado' : 'Usuario creado')
    } catch (e) {
      console.error(e)
      alert(editingId ? 'Error al actualizar usuario' : 'Error al crear usuario')
    }
  }

  const toggleActive = async (u) => {
    try {
      const newActive = u.is_active ? 0 : 1

      const res = await apiFetch(`/users/${u.id}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(data.message || `Error al cambiar estado (${res.status})`)
        return
      }

      await load()
    } catch (e) {
      console.error(e)
      alert('Error al cambiar estado')
    }
  }

  const removeUser = async (u) => {
    if (!window.confirm(`¿Eliminar usuario "${u.username}"?`)) return

    try {
      const res = await apiFetch(`/users/${u.id}`, {
        method: 'DELETE'
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(data.message || `Error al eliminar (${res.status})`)
        return
      }

      await load()
      if (editingId === u.id) resetForm()
      alert('Usuario eliminado')
    } catch (e) {
      console.error(e)
      alert('Error al eliminar usuario')
    }
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          type="button"
          className={`users-page-number ${currentPage === i ? 'active' : ''}`}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </button>
      )
    }

    return (
      <>
        <div className="users-pagination">
          <button
            type="button"
            className="users-page-arrow"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            ‹
          </button>

          <div className="users-page-numbers">{pages}</div>

          <button
            type="button"
            className="users-page-arrow"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            ›
          </button>
        </div>

        <div className="users-pagination-info">
          {currentPage} de {totalPages} usuarios
        </div>
      </>
    )
  }

  return (
    <section className="users-page">
      <div className="users-layout">
        <div className="users-form-card">
          <div className="users-form-header">
            <h3>{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          </div>

          <form className="users-form" autoComplete="off" onSubmit={submitUser}>
            <label>
              Usuario
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Ej: vendedor2"
                required
              />
            </label>

            <label>
              Nombre
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Juan Pérez"
              />
            </label>

            <label>
              Rol
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="SALES">Vendedor</option>
                <option value="WAREHOUSE">Almacén</option>
                <option value="ADMIN">Administrador</option>
                <option value="SUPERADMIN">Super Administrador</option>
              </select>
            </label>

            <label>
              {editingId ? 'Nueva contraseña' : 'Contraseña'}
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingId ? 'Solo si deseas cambiarla' : ''}
                required={!editingId}
              />
            </label>

            <div className="users-password-note">
              {editingId ? '(Déjalo vacío para no cambiarla)' : '(Solo al crear)'}
            </div>

            <button type="submit" className="users-submit-btn">
              {editingId ? 'Guardar cambios' : 'Agregar Usuario'}
            </button>

            {editingId && (
              <button
                type="button"
                className="users-cancel-btn"
                onClick={resetForm}
              >
                Cancelar
              </button>
            )}
          </form>
        </div>

        <div className="users-table-card">
          <div className="users-table-head">
            <h3>Lista de Usuarios</h3>
          </div>

          <div className="users-search-wrap">
            <span className="users-search-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7"></circle>
                <path d="M20 20l-3.5-3.5"></path>
              </svg>
            </span>
            <input
              className="users-search-input"
              placeholder="Buscar usuario, nombre o rol"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          {paginatedUsers.length === 0 ? (
            <p className="users-empty">No hay usuarios.</p>
          ) : (
            <>
              <div className="users-table-wrap">
                <table className="data-table users-table">
                  <thead>
                    <tr>
                      <th>USUARIO</th>
                      <th>NOMBRE</th>
                      <th>ROL</th>
                      <th>ESTADO</th>
                      <th>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((u) => (
                      <tr key={u.id}>
                        <td><strong>{u.username}</strong></td>
                        <td>{u.name}</td>
                        <td>{ROLE_LABEL[u.role] || u.role}</td>
                        <td>
                          <span className={`users-status-pill ${u.is_active ? 'active' : 'inactive'}`}>
                            {u.is_active ? 'Activo' : 'Deshabilitado'}
                          </span>
                          {u.is_system ? <span className="users-system-tag">sistema</span> : null}
                        </td>
                        <td className="users-actions-cell">
                          <button
                            type="button"
                            className="users-action-btn blue"
                            onClick={() => startEdit(u)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className={`users-action-btn ${u.is_active ? 'red' : 'green'}`}
                            onClick={() => toggleActive(u)}
                            disabled={u.is_system}
                            title={u.is_system ? 'Cuenta del sistema' : ''}
                          >
                            {u.is_active ? 'Deshabilitar' : 'Habilitar'}
                          </button>

                          {!u.is_system && (
                            <button
                              type="button"
                              className="users-action-btn red-outline"
                              onClick={() => removeUser(u)}
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {renderPagination()}
            </>
          )}
        </div>
      </div>
    </section>
  )
}