const pool = require('../db')
const { log } = require('./auditController')

exports.getCompany = async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM company LIMIT 1')
  res.json(rows[0] || {})
}

exports.updateCompany = async (req, res) => {
  try {
    const { name, address, phone, phone2, email, ruc, logo } = req.body

    console.log("BODY RECIBIDO:", req.body)

    const [rows] = await pool.query('SELECT * FROM company LIMIT 1')
    const before = rows[0] || null

    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO company (name, address, phone, phone2, email, ruc, logo) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, address, phone, phone2 || null, email, ruc, logo]
      )
    } else {
      await pool.query(
        'UPDATE company SET name=?, address=?, phone=?, phone2=?, email=?, ruc=?, logo=? WHERE id=?',
        [name, address, phone, phone2 || null, email, ruc, logo, rows[0].id]
      )
    }

    // Devolver el registro actualizado para que el frontend actualice el estado sin recargar
    const [updated] = await pool.query('SELECT * FROM company LIMIT 1')
    await log({
      user_id: req.user?.id,
      action: 'UPDATE',
      entity: 'company',
      entity_id: rows[0]?.id || null,
      before_json: before ? {
        nombre: before.name,
        direccion: before.address || '—',
        telefono: before.phone || '—',
        telefono2: before.phone2 || '—',
        email: before.email || '—',
        ruc: before.ruc || '—'
      } : null,
      after_json: {
        nombre: name,
        direccion: address || '—',
        telefono: phone || '—',
        telefono2: phone2 || '—',
        email: email || '—',
        ruc: ruc || '—'
      }
    })
    res.json(updated[0] || { name, address, phone, phone2, email, ruc, logo })

  } catch (error) {
    console.error("ERROR EN updateCompany:", error)
    res.status(500).json({ ok: false, error: error.message })
  }
}
