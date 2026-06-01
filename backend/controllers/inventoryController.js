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
    await pool.query(`
      ALTER TABLE inventory 
      ADD COLUMN IF NOT EXISTS provider_id INT NULL DEFAULT NULL
    `).catch(() => {})

    const [result] = await pool.query(
      'INSERT INTO inventory (name, sku, qty, price, provider_id) VALUES (?, ?, ?, ?, ?)',
      [name, sku, qty, price, provider_id || null]
    )

    let provider_name = null
    if (provider_id) {
      const [pRows] = await pool.query('SELECT name FROM providers WHERE id = ?', [provider_id])
      provider_name = pRows[0]?.name || null
    }

    await log({ user_id: req.user?.id, action: 'CREATE', entity: 'inventory', entity_id: result.insertId, after_json: {
      nombre: name,
      sku: sku || '—',
      cantidad: qty,
      precio_unitario: `S/ ${Number(price).toFixed(2)}`,
      proveedor: provider_name || '—'
    } })
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

    let upd_provider_name = null
    if (provider_id) {
      const [pRowsUpd] = await pool.query('SELECT name FROM providers WHERE id=?', [provider_id])
      upd_provider_name = pRowsUpd[0]?.name || null
    }
    await log({ user_id: req.user?.id, action: 'UPDATE', entity: 'inventory', entity_id: id, after_json: {
      nombre: name,
      sku: sku || '—',
      cantidad: qty,
      precio_unitario: `S/ ${Number(price).toFixed(2)}`,
      proveedor: upd_provider_name || '—'
    } })
    res.json({ message: 'Producto actualizado' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error al actualizar producto' })
  }
}

exports.deleteInventory = async (req, res) => {
  const { id } = req.params
  const conn = await pool.getConnection()
  await conn.beginTransaction()

  try {
    // 1. Obtener datos del producto antes de eliminar (para auditoría)
    const [rows] = await conn.query('SELECT * FROM inventory WHERE id=?', [id])
    if (rows.length === 0) {
      await conn.rollback()
      conn.release()
      return res.status(404).json({ message: 'Producto no encontrado' })
    }
    const before = rows[0]

    // 2. Verificar si hay ventas activas con este producto
    //    (sale_items sin revertir) — esas NO se pueden perder
    const [activeSaleItems] = await conn.query(
      `SELECT COUNT(*) AS total 
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE si.inventory_id = ?`,
      [id]
    )
    if (activeSaleItems[0].total > 0) {
      await conn.rollback()
      conn.release()
      return res.status(409).json({
        message: `No se puede eliminar: el producto tiene ${activeSaleItems[0].total} venta(s) registrada(s). Reviértelas primero desde Historial.`
      })
    }

    // 3. Eliminar movimientos de inventario asociados
    await conn.query('DELETE FROM inventory_movements WHERE inventory_id=?', [id])

    // 4. Eliminar el producto físicamente
    await conn.query('DELETE FROM inventory WHERE id=?', [id])

    await conn.commit()

    // 5. Registrar en auditoría con todos los datos del producto eliminado
    await log({
      user_id: req.user?.id,
      action: 'DELETE',
      entity: 'inventory',
      entity_id: id,
      before_json: before
    })

    res.json({ message: 'Producto eliminado correctamente' })
  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: 'Error al eliminar producto' })
  } finally {
    conn.release()
  }
}
