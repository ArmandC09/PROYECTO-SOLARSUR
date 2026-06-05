const pool = require('../db')
const { log } = require('./auditController')

exports.getProviders = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM providers ORDER BY id DESC')
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proveedores' })
  }
}

exports.createProvider = async (req, res) => {
  const { name, contact, phone } = req.body
  try {
    const [result] = await pool.query(
      'INSERT INTO providers (name, contact, phone) VALUES (?, ?, ?)',
      [name, contact, phone]
    )
    await log({ user_id: req.user?.id, action: 'CREATE', entity: 'providers', entity_id: result.insertId, after_json: { name, contact, phone } })
    res.json({ id: result.insertId, name, contact, phone })
  } catch (error) {
    res.status(500).json({ message: 'Error al crear proveedor' })
  }
}

exports.updateProvider = async (req, res) => {
  const { id } = req.params
  const { name, contact, phone } = req.body
  try {
    // Leer datos ANTES de editar para auditoría
    const [[before]] = await pool.query('SELECT * FROM providers WHERE id=?', [id])

    await pool.query(
      'UPDATE providers SET name=?, contact=?, phone=? WHERE id=?',
      [name, contact, phone, id]
    )
    await log({
      user_id: req.user?.id,
      action: 'UPDATE',
      entity: 'providers',
      entity_id: id,
      before_json: before ? {
        nombre: before.name,
        contacto: before.contact || '—',
        telefono: before.phone || '—'
      } : null,
      after_json: {
        nombre: name,
        contacto: contact || '—',
        telefono: phone || '—'
      }
    })
    res.json({ message: 'Proveedor actualizado' })
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar proveedor' })
  }
}

exports.deleteProvider = async (req, res) => {
  const { id } = req.params
  try {
    const [[before]] = await pool.query('SELECT * FROM providers WHERE id=?', [id])
    await pool.query('DELETE FROM providers WHERE id=?', [id])
    await log({
      user_id: req.user?.id, action: 'DELETE', entity: 'providers', entity_id: id,
      before_json: before ? {
        nombre: before.name,
        contacto: before.contact || '—',
        telefono: before.phone || '—'
      } : null
    })
    res.json({ message: 'Proveedor eliminado' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar proveedor' })
  }
}
