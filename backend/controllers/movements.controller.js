const pool = require('../db')
const { log } = require('./auditController')

// GET /api/movements
exports.getMovements = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        m.id,
        m.inventory_id,
        i.name AS inventory_name,
        i.sku,
        m.type,
        m.qty,
        m.reason,
        m.user_id,
        u.username,
        m.created_at
      FROM inventory_movements m
      JOIN inventory i ON i.id = m.inventory_id
      LEFT JOIN users u ON u.id = m.user_id
      ORDER BY m.id DESC
      LIMIT 300
    `)

    res.json(rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Error al obtener movimientos' })
  }
}

// POST /api/movements
exports.createMovement = async (req, res) => {
  const { inventory_id, type, qty, note } = req.body

  if (!inventory_id || !type || !qty) {
    return res.status(400).json({ message: 'Faltan campos' })
  }

  if (!['IN', 'OUT'].includes(type)) {
    return res.status(400).json({ message: 'El tipo debe ser IN o OUT' })
  }

  const q = Number(qty)
  if (!Number.isFinite(q) || q <= 0) {
    return res.status(400).json({ message: 'Cantidad inválida' })
  }

  const conn = await pool.getConnection()
  await conn.beginTransaction()

  try {
    const [invRows] = await conn.query(
      `SELECT qty FROM inventory WHERE id = ? FOR UPDATE`,
      [inventory_id]
    )

    if (invRows.length === 0) {
      await conn.rollback()
      return res.status(404).json({ message: 'Producto no existe' })
    }

    const currentQty = Number(invRows[0].qty)

    if (type === 'OUT' && currentQty < q) {
      await conn.rollback()
      return res.status(400).json({ message: 'Stock insuficiente' })
    }

    const delta = type === 'IN' ? q : -q

    await conn.query(
      `UPDATE inventory SET qty = qty + ? WHERE id = ?`,
      [delta, inventory_id]
    )

    const user_id = req.user.id

    const [result] = await conn.query(
      `INSERT INTO inventory_movements (inventory_id, user_id, type, qty, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [inventory_id, user_id, type, q, note || '']
    )

    await conn.commit()

    await log({
      user_id,
      action: type === 'IN' ? 'MOVEMENT_IN' : 'MOVEMENT_OUT',
      entity: 'inventory_movement',
      entity_id: result.insertId,
      after_json: { inventory_id, type, qty: q, reason: note || '' },
      ip: req.ip,
      user_agent: req.headers['user-agent']
    })

    res.json({
      id: result.insertId,
      inventory_id,
      user_id,
      type,
      qty: q,
      reason: note || ''
    })
  } catch (e) {
    await conn.rollback()
    console.error(e)
    res.status(500).json({ message: 'Error al crear movimiento' })
  } finally {
    conn.release()
  }
}
