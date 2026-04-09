const pool = require('../db')

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

    res.json({ id: result.insertId, name, contact, phone })
  } catch (error) {
    res.status(500).json({ message: 'Error al crear proveedor' })
  }
}

exports.updateProvider = async (req, res) => {
  const { id } = req.params
  const { name, contact, phone } = req.body

  try {
    await pool.query(
      'UPDATE providers SET name=?, contact=?, phone=? WHERE id=?',
      [name, contact, phone, id]
    )

    res.json({ message: 'Proveedor actualizado' })
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar proveedor' })
  }
}

exports.deleteProvider = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query('DELETE FROM providers WHERE id=?', [id])
    res.json({ message: 'Proveedor eliminado' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar proveedor' })
  }
}