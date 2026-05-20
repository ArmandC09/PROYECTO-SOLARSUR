const pool = require('../db')

const getKitsFull = async () => {
  const [kits] = await pool.query('SELECT * FROM kits ORDER BY created_at DESC')
  if (kits.length === 0) return []
  const kitIds = kits.map(k => k.id)
  const [items] = await pool.query(`
    SELECT ki.*, i.name as product_name, i.sku, i.stock, i.unit
    FROM kit_items ki
    JOIN inventory i ON i.id = ki.product_id
    WHERE ki.kit_id IN (?)
  `, [kitIds])
  return kits.map(kit => {
    const kitItems = items.filter(it => it.kit_id === kit.id)
    const available = kitItems.length > 0 && kitItems.every(it => Number(it.stock) >= Number(it.qty))
    const total = kitItems.reduce((s, it) => s + (Number(it.kit_price) * Number(it.qty)), 0)
    return { ...kit, items: kitItems, available, total }
  })
}

exports.getKits = async (req, res) => {
  try {
    res.json(await getKitsFull())
  } catch (e) {
    console.error('getKits error:', e)
    res.status(500).json({ error: e.message })
  }
}

exports.createKit = async (req, res) => {
  try {
    const { name, description, items } = req.body
    if (!name) return res.status(400).json({ error: 'Nombre requerido' })

    const [r] = await pool.query(
      'INSERT INTO kits (name, description) VALUES (?, ?)',
      [name, description || null]
    )
    const kitId = r.insertId

    if (items && items.length > 0) {
      for (const it of items) {
        await pool.query(
          'INSERT INTO kit_items (kit_id, product_id, qty, kit_price) VALUES (?, ?, ?, ?)',
          [kitId, it.product_id, Number(it.qty), Number(it.kit_price)]
        )
      }
    }

    const [kits] = await pool.query('SELECT * FROM kits WHERE id = ?', [kitId])
    const [kitItems] = await pool.query(`
      SELECT ki.*, i.name as product_name, i.sku, i.stock, i.unit
      FROM kit_items ki JOIN inventory i ON i.id = ki.product_id
      WHERE ki.kit_id = ?
    `, [kitId])
    const available = kitItems.length > 0 && kitItems.every(it => Number(it.stock) >= Number(it.qty))
    const total = kitItems.reduce((s, it) => s + (Number(it.kit_price) * Number(it.qty)), 0)
    res.json({ ...kits[0], items: kitItems, available, total })
  } catch (e) {
    console.error('createKit error:', e)
    res.status(500).json({ error: e.message })
  }
}

exports.updateKit = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, items } = req.body

    await pool.query('UPDATE kits SET name=?, description=? WHERE id=?', [name, description || null, id])
    await pool.query('DELETE FROM kit_items WHERE kit_id=?', [id])

    if (items && items.length > 0) {
      for (const it of items) {
        await pool.query(
          'INSERT INTO kit_items (kit_id, product_id, qty, kit_price) VALUES (?, ?, ?, ?)',
          [id, it.product_id, Number(it.qty), Number(it.kit_price)]
        )
      }
    }

    const [kits] = await pool.query('SELECT * FROM kits WHERE id=?', [id])
    const [kitItems] = await pool.query(`
      SELECT ki.*, i.name as product_name, i.sku, i.stock, i.unit
      FROM kit_items ki JOIN inventory i ON i.id = ki.product_id
      WHERE ki.kit_id = ?
    `, [id])
    const available = kitItems.length > 0 && kitItems.every(it => Number(it.stock) >= Number(it.qty))
    const total = kitItems.reduce((s, it) => s + (Number(it.kit_price) * Number(it.qty)), 0)
    res.json({ ...kits[0], items: kitItems, available, total })
  } catch (e) {
    console.error('updateKit error:', e)
    res.status(500).json({ error: e.message })
  }
}

exports.deleteKit = async (req, res) => {
  try {
    await pool.query('DELETE FROM kits WHERE id=?', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
