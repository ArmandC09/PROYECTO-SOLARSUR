const pool = require('../db')
const { log } = require('./auditController')

async function ensureSalesSchema(conn = pool) {
  await conn.query(`
    ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS source_quote_id INT NULL AFTER total
  `).catch(() => {})

  await conn.query(`
    ALTER TABLE sale_items
    ADD COLUMN IF NOT EXISTS inventory_id INT NULL AFTER sale_id
  `).catch(() => {})

  await conn.query(`
    ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS ref_entity VARCHAR(50) NULL AFTER reason,
    ADD COLUMN IF NOT EXISTS ref_id BIGINT NULL AFTER ref_entity
  `).catch(() => {})
}

exports.getSales = async (req, res) => {
  const [sales] = await pool.query('SELECT * FROM sales ORDER BY id DESC')
  for (let sale of sales) {
    const [items] = await pool.query('SELECT * FROM sale_items WHERE sale_id=?', [sale.id])
    sale.items = items
  }
  res.json(sales)
}

exports.createSale = async (req, res) => {
  const { client_id, items, total, sourceQuoteId } = req.body

  const conn = await pool.getConnection()
  await conn.beginTransaction()

  try {
    await ensureSalesSchema(conn)

    const [result] = await conn.query(
      'INSERT INTO sales (client_id, total, source_quote_id) VALUES (?, ?, ?)',
      [client_id, total, sourceQuoteId || null]
    )

    const saleId = result.insertId

    for (let item of items) {
      await conn.query(
        'INSERT INTO sale_items (sale_id, inventory_id, description, qty, price) VALUES (?, ?, ?, ?, ?)',
        [saleId, item.inventory_id || null, item.description, item.qty, item.price]
      )
      if (item.inventory_id) {
        await conn.query(
          'UPDATE inventory SET qty = qty - ? WHERE id=?',
          [item.qty, item.inventory_id]
        )

        await conn.query(
          `INSERT INTO inventory_movements (inventory_id, user_id, type, qty, reason, ref_entity, ref_id)
           VALUES (?, ?, 'OUT', ?, ?, 'sale', ?)`,
          [
            item.inventory_id,
            req.user?.id || null,
            item.qty,
            `Salida por venta #${saleId}`,
            saleId
          ]
        )
      }
    }

    // Eliminar la cotización fuente en BD
    if (sourceQuoteId) {
      await conn.query('DELETE FROM quote_items WHERE quote_id=?', [sourceQuoteId])
      await conn.query('DELETE FROM quotes WHERE id=?', [sourceQuoteId])
    }

    await conn.commit()

    const [saleRows] = await conn.query('SELECT * FROM sales WHERE id=?', [saleId])
    const sale = saleRows[0]
    sale.items = items

    await log({
      user_id: req.user?.id,
      action: 'CREATE',
      entity: 'sales',
      entity_id: saleId,
      after_json: {
        client_id,
        total,
        source_quote_id: sourceQuoteId || null,
        items
      },
      ip: req.ip,
      user_agent: req.get('user-agent')
    })

    res.json(sale)

  } catch (error) {
    await conn.rollback()
    console.error(error)
    res.status(500).json({ message: 'Error al crear venta' })
  } finally {
    conn.release()
  }
}

exports.deleteSale = async (req, res) => {
  const { id } = req.params
  await pool.query('DELETE FROM sales WHERE id=?', [id])
  res.json({ message: 'Venta eliminada' })
}
