const pool = require('../db')
const { log } = require('./auditController')
const { log } = require('./auditController')

const getKitsFull = async () => {
  const [kits] = await pool.query('SELECT * FROM kits ORDER BY created_at DESC')
  if (kits.length === 0) return []
  const kitIds = kits.map(k => k.id)
  const [items] = await pool.query(`
    SELECT ki.*, i.name as product_name, i.sku, i.qty as stock, i.price as unit_price
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
      SELECT ki.*, i.name as product_name, i.sku, i.qty as stock, i.price as unit_price
      FROM kit_items ki JOIN inventory i ON i.id = ki.product_id
      WHERE ki.kit_id = ?
    `, [kitId])
    const available = kitItems.length > 0 && kitItems.every(it => Number(it.stock) >= Number(it.qty))
    const total = kitItems.reduce((s, it) => s + (Number(it.kit_price) * Number(it.qty)), 0)

    await log({
      user_id: req.user?.id,
      action: 'CREATE',
      entity: 'kits',
      entity_id: kitId,
      after_json: { name, description, items },
      ip: req.ip,
      user_agent: req.get('user-agent')
    })

    const kitData = { ...kits[0], items: kitItems, available, total }
    await log({ user_id: req.user?.id, action: 'CREATE', entity: 'kits', entity_id: kitId, after_json: { name, description, items }, ip: req.ip, user_agent: req.get('user-agent') })
    res.json(kitData)
  } catch (e) {
    console.error('createKit error:', e)
    res.status(500).json({ error: e.message })
  }
}

exports.updateKit = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, items } = req.body

    const [before] = await pool.query('SELECT * FROM kits WHERE id=?', [id])

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
      SELECT ki.*, i.name as product_name, i.sku, i.qty as stock, i.price as unit_price
      FROM kit_items ki JOIN inventory i ON i.id = ki.product_id
      WHERE ki.kit_id = ?
    `, [id])
    const available = kitItems.length > 0 && kitItems.every(it => Number(it.stock) >= Number(it.qty))
    const total = kitItems.reduce((s, it) => s + (Number(it.kit_price) * Number(it.qty)), 0)

    await log({
      user_id: req.user?.id,
      action: 'UPDATE',
      entity: 'kits',
      entity_id: Number(id),
      before_json: before[0] || null,
      after_json: { name, description, items },
      ip: req.ip,
      user_agent: req.get('user-agent')
    })

    const kitData = { ...kits[0], items: kitItems, available, total }
    await log({ user_id: req.user?.id, action: 'UPDATE', entity: 'kits', entity_id: Number(id), after_json: { name, description, items }, ip: req.ip, user_agent: req.get('user-agent') })
    res.json(kitData)
  } catch (e) {
    console.error('updateKit error:', e)
    res.status(500).json({ error: e.message })
  }
}

exports.deleteKit = async (req, res) => {
  try {
    const { id } = req.params
    const [before] = await pool.query('SELECT * FROM kits WHERE id=?', [id])

    await pool.query('DELETE FROM kits WHERE id=?', [id])

    await log({
      user_id: req.user?.id,
      action: 'DELETE',
      entity: 'kits',
      entity_id: Number(id),
      before_json: before[0] || null,
      ip: req.ip,
      user_agent: req.get('user-agent')
    })

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
