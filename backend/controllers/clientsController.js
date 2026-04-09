const pool = require('../db')

exports.getClients = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clients ORDER BY id DESC')
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al obtener clientes' })
  }
}

exports.createClient = async (req, res) => {
  const { name, phone, address, dni, ruc, email, district, city } = req.body
  try {
    const [result] = await pool.query(
      'INSERT INTO clients (name, phone, address, dni, ruc, email, district, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, phone||null, address||null, dni||null, ruc||null, email||null, district||null, city||null]
    )
    res.json({ id: result.insertId, name, phone, address, dni, ruc, email, district, city })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al crear cliente' })
  }
}

exports.updateClient = async (req, res) => {
  const { id } = req.params
  const { name, phone, address, dni, ruc, email, district, city } = req.body
  try {
    await pool.query(
      'UPDATE clients SET name=?, phone=?, address=?, dni=?, ruc=?, email=?, district=?, city=? WHERE id=?',
      [name, phone||null, address||null, dni||null, ruc||null, email||null, district||null, city||null, id]
    )
    res.json({ message: 'Cliente actualizado' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al actualizar cliente' })
  }
}

exports.deleteClient = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('DELETE FROM clients WHERE id=?', [id])
    res.json({ message: 'Cliente eliminado' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al eliminar cliente' })
  }
}
