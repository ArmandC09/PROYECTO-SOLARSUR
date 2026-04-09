import React, { useState, useEffect, useContext } from 'react'
import AppContext from '../context/AppContext'
import { resizeFileToDataURL } from '../utils/image'
import ModalPortal from './ModalPortal'

export default function CompanyProfile() {
  const { company, updateCompany } = useContext(AppContext)

  const emptyCompany = {
    name: 'SolarSur',
    address: '',
    phone: '',
    ruc: '',
    logo: '',
    email: ''
  }

  const [form, setForm] = useState(company || emptyCompany)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setForm(company || emptyCompany)
  }, [company])

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return

    resizeFileToDataURL(f, 800, 0.78)
      .then((dataUrl) => setForm((c) => ({ ...c, logo: dataUrl })))
      .catch(() => {
        const reader = new FileReader()
        reader.onload = () => setForm((c) => ({ ...c, logo: reader.result }))
        reader.readAsDataURL(f)
      })
  }

  const save = async () => {
    const res = await updateCompany(form)

    if (res && res.ok) {
      setForm((cur) => ({ ...cur, ...res.stored }))
      setMessage('Perfil guardado correctamente')
      setTimeout(() => setMessage(''), 2500)
      return true
    } else {
      setMessage('Error al guardar empresa')
      setTimeout(() => setMessage(''), 4000)
      return false
    }
  }

  useEffect(() => {
    const beforeUnload = (e) => {
      const current = JSON.stringify(form)
      const stored = JSON.stringify(company || {})
      if (current !== stored) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [form, company])

  return (
    <section className="company-page fade-in">
      <div className="company-page-head">
        <div className="company-breadcrumb">
          Configuración <span>/</span> Perfil de Empresa
        </div>

        <h1>Perfil de Empresa</h1>
        <p>Ajusta la información de tu empresa</p>
      </div>

      <div className="company-layout">
        <div className="company-form-card company-summary-card">
          <div className="company-summary-top">
            <div>
              <h3>Perfil actual</h3>
              <p>Abre el formulario en ventana centrada para editar sin desplazar el contenido.</p>
            </div>
            <button type="button" className="clients-new-btn company-open-modal-btn" onClick={() => setEditing(true)}>
              Editar perfil
            </button>
          </div>

          {message && (
            <div className="company-alert">
              {message}
            </div>
          )}

          <div className="company-summary-grid">
            <div className="company-summary-item">
              <span>Empresa</span>
              <strong>{form.name || 'SolarSur'}</strong>
            </div>
            <div className="company-summary-item">
              <span>RUC</span>
              <strong>{form.ruc || 'Sin registrar'}</strong>
            </div>
            <div className="company-summary-item">
              <span>Teléfono</span>
              <strong>{form.phone || 'Sin registrar'}</strong>
            </div>
            <div className="company-summary-item">
              <span>Email</span>
              <strong>{form.email || 'Sin registrar'}</strong>
            </div>
            <div className="company-summary-item company-summary-item-wide">
              <span>Dirección</span>
              <strong>{form.address || 'Sin dirección registrada'}</strong>
            </div>
          </div>
        </div>

        <aside className="company-preview-card">
          <div className="company-preview-top">
            {form.logo ? (
              <img src={form.logo} alt="Logo empresa" className="company-preview-logo" />
            ) : (
              <div className="company-preview-logo company-preview-logo-placeholder">
                SolarSur
              </div>
            )}
          </div>

          <div className="company-preview-body">
            <h4>Perfil de Empresa</h4>

            <ul className="company-preview-list">
              <li><span>◎</span> <strong>{form.name || 'SolarSur'}</strong></li>
              <li><span>⌖</span> {form.address || 'Sin dirección registrada'}</li>
              <li><span>✆</span> {form.phone || 'Sin teléfono registrado'}</li>
              <li><span>▣</span> {form.ruc || 'Sin RUC registrado'}</li>
              <li><span>✉</span> {form.email || 'Sin correo registrado'}</li>
            </ul>

            <div className="company-preview-badge">
              Sistema solar
            </div>
          </div>
        </aside>
      </div>

      {editing && (
        <ModalPortal>
          <div className="ss-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditing(false) }}>
            <div className="ss-modal ss-modal-wide company-modal">
              <div className="ss-modal-head">
                <div>
                  <h3>Editar Perfil de Empresa</h3>
                  <p>Formulario grande sobre fondo gris opaco</p>
                </div>
                <button type="button" className="ss-modal-close" onClick={() => setEditing(false)}>✕</button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const ok = await save()
                  if (ok) setEditing(false)
                }}
              >
                <div className="ss-modal-body">
                  <div className="ss-row-2">
                    <div className="ss-field">
                      <label>Nombre de la empresa</label>
                      <input
                        value={form.name || ''}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>

                    <div className="ss-field">
                      <label>RUC</label>
                      <input
                        value={form.ruc || ''}
                        onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="ss-row-2">
                    <div className="ss-field">
                      <label>Teléfono</label>
                      <input
                        value={form.phone || ''}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>

                    <div className="ss-field">
                      <label>Email</label>
                      <input
                        value={form.email || ''}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="ss-field">
                    <label>Dirección</label>
                    <input
                      value={form.address || ''}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>

                  <div className="ss-field">
                    <label>Logo</label>
                    <div className="company-logo-upload">
                      <div className="company-logo-file">
                        {form.logo ? (
                          <img src={form.logo} alt="Logo empresa" className="company-logo-inline" />
                        ) : (
                          <div className="company-logo-inline company-logo-placeholder">
                            Logo
                          </div>
                        )}

                        <span className="company-file-text">
                          {form.logo ? 'Logo cargado correctamente' : 'No se ha seleccionado ningún archivo'}
                        </span>
                      </div>

                      <div className="company-logo-actions">
                        <label className="company-upload-btn">
                          Seleccionar
                          <input type="file" accept="image/*" onChange={onFile} hidden />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ss-modal-foot">
                  <button type="button" className="ss-btn-cancel" onClick={() => setEditing(false)}>Cancelar</button>
                  <button type="submit" className="ss-btn-primary">Guardar cambios</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  )
}