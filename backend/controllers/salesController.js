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
  const { client_id, items, total, sourceQuoteId, discount_type, discountValue, discountReason } = req.body

  const conn = await pool.getConnection()
  await conn.beginTransaction()

  try {
    await ensureSalesSchema(conn)

    // Validar stock suficiente para todos los items ANTES de crear la venta
    for (const item of items) {
      if (item.inventory_id) {
        const [invRows] = await conn.query(
          'SELECT qty, name FROM inventory WHERE id = ? FOR UPDATE',
          [item.inventory_id]
        )
        if (invRows.length === 0) {
          await conn.rollback()
          conn.release()
          return res.status(400).json({ message: `Producto no encontrado (ID: ${item.inventory_id})` })
        }
        const available = Number(invRows[0].qty)
        const needed = Number(item.qty)
        if (available < needed) {
          await conn.rollback()
          conn.release()
          return res.status(400).json({
            message: `Stock insuficiente para "${invRows[0].name}": disponible ${available}, necesario ${needed}`
          })
        }
      }
    }

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

    const [[saleClientRow]] = await conn.query('SELECT name FROM clients WHERE id=?', [client_id])
    await log({
      user_id: req.user?.id,
      action: 'CREATE',
      entity: 'sales',
      entity_id: saleId,
      after_json: {
        venta_id: `VTA-${String(saleId).padStart(5,'0')}`,
        cliente: saleClientRow?.name || `Cliente ID ${client_id}`,
        total_soles: `S/ ${Number(total).toFixed(2)}`,
        descuento: (discount_type && discountValue > 0)
          ? `${discountValue}${discount_type === 'percent' ? '%' : ' S/'} — ${discountReason || 'sin motivo'}`
          : 'Sin descuento',
        cotizacion_origen: sourceQuoteId ? `COT-${String(sourceQuoteId).padStart(5,'0')}` : null,
        productos: Array.isArray(items)
          ? items.map(it => `${it.description || it.name || 'Producto'} (x${it.qty} · S/ ${it.price})`)
          : []
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

exports.revertSale = async (req, res) => {
  const { id } = req.params
  const conn = await pool.getConnection()
  await conn.beginTransaction()

  try {
    await ensureSalesSchema(conn)

    // Obtener la venta
    const [saleRows] = await conn.query('SELECT * FROM sales WHERE id=?', [id])
    if (!saleRows.length) {
      conn.release()
      return res.status(404).json({ message: 'Venta no encontrada' })
    }
    const sale = saleRows[0]

    // Obtener los ítems de la venta
    const [items] = await conn.query('SELECT * FROM sale_items WHERE sale_id=?', [id])

    // Restaurar inventario para cada ítem que tenía inventory_id
    for (let item of items) {
      if (item.inventory_id) {
        await conn.query(
          'UPDATE inventory SET qty = qty + ? WHERE id=?',
          [item.qty, item.inventory_id]
        )

        await conn.query(
          `INSERT INTO inventory_movements (inventory_id, user_id, type, qty, reason, ref_entity, ref_id)
           VALUES (?, ?, 'IN', ?, ?, 'sale_revert', ?)`,
          [
            item.inventory_id,
            req.user?.id || null,
            item.qty,
            `Reingreso por reversión de venta #${id}`,
            id
          ]
        )
      }
    }

    // Registrar auditoría ANTES de eliminar
    const [[revertClientRow]] = await conn.query('SELECT name FROM clients WHERE id=?', [sale.client_id])
    await log({
      user_id: req.user?.id,
      action: 'REVERT',
      entity: 'sales',
      entity_id: Number(id),
      before_json: {
        venta_id: `VTA-${String(id).padStart(5,'0')}`,
        cliente: revertClientRow?.name || `Cliente ID ${sale.client_id}`,
        total_soles: `S/ ${Number(sale.total).toFixed(2)}`,
        productos: items.map(it => `${it.description || it.name || 'Producto'} (x${it.qty} · S/ ${it.price})`)
      },
      ip: req.ip,
      user_agent: req.get('user-agent')
    })

    // Eliminar ítems y venta
    await conn.query('DELETE FROM sale_items WHERE sale_id=?', [id])
    await conn.query('DELETE FROM sales WHERE id=?', [id])

    await conn.commit()
    res.json({ message: `Venta #${id} revertida exitosamente. Stock restaurado.` })

  } catch (error) {
    await conn.rollback()
    console.error('revertSale error:', error)
    res.status(500).json({ message: 'Error al revertir la venta' })
  } finally {
    conn.release()
  }
}

exports.deleteSale = async (req, res) => {
  const { id } = req.params
  await pool.query('DELETE FROM sales WHERE id=?', [id])
  res.json({ message: 'Venta eliminada' })
}
