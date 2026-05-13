const pool = require('../db')
const { log } = require('./auditController')

exports.getInventory = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*, p.name AS provider_name
      FROM inventory i
      LEFT JOIN providers p ON p.id = i.provider_id
      ORDER BY i.id DESC
    `)
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al obtener inventario' })
  }
}

exports.createInventory = async (req, res) => {
  const { name, sku, qty, price, provider_id } = req.body

  try {
    // Ensure provider_id column exists
    await pool.query(`
      ALTER TABLE inventory 
      ADD COLUMN IF NOT EXISTS provider_id INT NULL DEFAULT NULL
    `).catch(() => {}) // ignore if already exists

    const [result] = await pool.query(
      'INSERT INTO inventory (name, sku, qty, price, provider_id) VALUES (?, ?, ?, ?, ?)',
      [name, sku, qty, price, provider_id || null]
    )

    // Fetch provider_name so the frontend shows it immediately without refresh
    let provider_name = null
    if (provider_id) {
      const [pRows] = await pool.query('SELECT name FROM providers WHERE id = ?', [provider_id])
      provider_name = pRows[0]?.name || null
    }

    await log({ user_id: req.user?.id, action: 'CREATE', entity: 'inventory', entity_id: result.insertId, after_json: { name, sku, qty, price, provider_id } })
    res.json({ id: result.insertId, name, sku, qty, price, provider_id: provider_id || null, provider_name })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al crear producto' })
  }
}

exports.updateInventory = async (req, res) => {
  const { id } = req.params
  const { name, sku, qty, price, provider_id } = req.body

  try {
    await pool.query(
      'UPDATE inventory SET name=?, sku=?, qty=?, price=?, provider_id=? WHERE id=?',
      [name, sku, qty, price, provider_id || null, id]
    )

    await log({ user_id: req.user?.id, action: 'UPDATE', entity: 'inventory', entity_id: id, after_json: { name, sku, qty, price, provider_id } })
    res.json({ message: 'Producto actualizado' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al actualizar producto' })
  }
}

exports.deleteInventory = async (req, res) => {
  const { id } = req.params

  try {
    // Guardar datos actuales antes de eliminar (para auditoría)
    const [rows] = await pool.query('SELECT * FROM inventory WHERE id=?', [id])
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' })
    }
    const before = rows[0]

    await pool.query('DELETE FROM inventory WHERE id=?', [id])

    await log({
      user_id: req.user?.id,
      action: 'DELETE',
      entity: 'inventory',
      entity_id: id,
      before_json: before
    })

    res.json({ message: 'Producto eliminado' })
  } catch (error) {
    console.error(error)
    // Si hay error de clave foránea (el producto tiene ventas o movimientos)
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(409).json({ message: 'No se puede eliminar: el producto tiene ventas o movimientos asociados.' })
    }
    res.status(500).json({ message: 'Error al eliminar producto' })
  }
}
