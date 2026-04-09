const pool = require('../db')

// GET /api/audit  — solo SUPERADMIN
exports.list = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500)
    const [rows] = await pool.query(
      `SELECT al.*, u.name AS user_name, u.username
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [limit]
    )
    res.json(rows)
  } catch (err) {
    console.error('audit.list error:', err)
    res.status(500).json({ message: 'Error al cargar auditoría' })
  }
}

// Helper exportado para registrar desde otros controladores
exports.log = async ({ user_id, action, entity, entity_id, before_json, after_json, ip, user_agent }) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_json, after_json, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id || null,
        action,
        entity || null,
        entity_id || null,
        before_json ? JSON.stringify(before_json) : null,
        after_json ? JSON.stringify(after_json) : null,
        ip || null,
        user_agent || null
      ]
    )
  } catch (err) {
    console.error('audit.log error:', err)
  }
}
