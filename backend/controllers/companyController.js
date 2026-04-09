const pool = require('../db')

exports.getCompany = async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM company LIMIT 1')
  res.json(rows[0] || {})
}

exports.updateCompany = async (req, res) => {
  try {
    const { name, address, phone, email, ruc, logo } = req.body

    console.log("BODY RECIBIDO:", req.body)

    const [rows] = await pool.query('SELECT id FROM company LIMIT 1')

    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO company (name, address, phone, email, ruc, logo) VALUES (?, ?, ?, ?, ?, ?)',
        [name, address, phone, email, ruc, logo]
      )
    } else {
      await pool.query(
        'UPDATE company SET name=?, address=?, phone=?, email=?, ruc=?, logo=? WHERE id=?',
        [name, address, phone, email, ruc, logo, rows[0].id]
      )
    }

    res.json({ ok: true })

  } catch (error) {
    console.error("ERROR EN updateCompany:", error)
    res.status(500).json({ ok: false, error: error.message })
  }
}