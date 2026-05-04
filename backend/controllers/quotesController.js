const pool = require('../db')
const { log } = require('./auditController')

async function ensureQuoteItemsInventoryIdColumn(conn = pool) {
  await conn.query(`
    ALTER TABLE quote_items
    ADD COLUMN IF NOT EXISTS inventory_id INT NULL AFTER quote_id
  `).catch(() => {})

  await conn.query(`
    ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS source_quote_id INT NULL AFTER total
  `).catch(() => {})
}

exports.getQuotes = async (req, res) => {
  try {
    await ensureQuoteItemsInventoryIdColumn()

    const [quotes] = await pool.query(`
      SELECT q.*
      FROM quotes q
      WHERE NOT EXISTS (
        SELECT 1
        FROM sales s
        WHERE s.source_quote_id = q.id
      )
      ORDER BY q.id DESC
    `)

    for (let quote of quotes) {
      const [items] = await pool.query(
        'SELECT * FROM quote_items WHERE quote_id=?',
        [quote.id]
      )
      quote.items = items
    }

    res.json(quotes)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cotizaciones' })
  }
}

exports.createQuote = async (req, res) => {
  const { client_id, items, total } = req.body

  const conn = await pool.getConnection()
  await conn.beginTransaction()

  try {
    await ensureQuoteItemsInventoryIdColumn(conn)

    const [result] = await conn.query(
      'INSERT INTO quotes (client_id, total) VALUES (?, ?)',
      [client_id, total]
    )

    const quoteId = result.insertId

    for (let item of items) {
      await conn.query(
        'INSERT INTO quote_items (quote_id, inventory_id, description, qty, price) VALUES (?, ?, ?, ?, ?)',
        [quoteId, item.inventory_id || null, item.description, item.qty, item.price]
      )
    }

    await conn.commit()

    await log({
      user_id: req.user?.id || null,
      action: 'CREATE',
      entity: 'quote',
      entity_id: quoteId,
      after_json: { id: quoteId, client_id, total, items },
      ip: req.ip,
      user_agent: req.headers['user-agent']
    })

    res.json({
      id: quoteId,
      client_id,
      items: items.map((item) => ({
        inventory_id: item.inventory_id || null,
        description: item.description,
        qty: item.qty,
        price: item.price
      })),
      total
    })

  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: 'Error al crear cotización' })
  } finally {
    conn.release()
  }
}

exports.deleteQuote = async (req, res) => {
  const { id } = req.params
  const user_id = req.user?.id || null
  await pool.query('DELETE FROM quotes WHERE id=?', [id])
  await log({
    user_id,
    action: 'DELETE',
    entity: 'quote',
    entity_id: Number(id),
    ip: req.ip,
    user_agent: req.headers['user-agent']
  })
  res.json({ message: 'Cotización eliminada' })
}
