// controllers/users.controller.js
const pool = require('../db')
const bcrypt = require('bcrypt')

const SYSTEM_USERS = new Set(['superadmin', 'admin', 'ventas1', 'almacen1'])

function isSystemUser(userRow) {
  return SYSTEM_USERS.has(String(userRow?.username || '').toLowerCase())
}

// GET /api/users
exports.list = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, name, role, is_active FROM users ORDER BY id ASC'
    )

    // marcamos cuáles son sistema (para UI / reglas)
    const out = rows.map(u => ({
      ...u,
      is_system: SYSTEM_USERS.has(String(u.username).toLowerCase())
    }))

    return res.json(out)
  } catch (err) {
    console.error('users.list error:', err)
    return res.status(500).json({ message: 'Error al cargar usuarios' })
  }
}

// POST /api/users
// body: { username, name, role, password }
exports.create = async (req, res) => {
  try {
    const { username, name, role, password } = req.body || {}

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'username, password y role son requeridos' })
    }

    const u = String(username).trim()
    if (u.length < 3) return res.status(400).json({ message: 'El usuario debe tener al menos 3 caracteres' })
    if (String(password).length < 4) return res.status(400).json({ message: 'La contraseña debe tener al menos 4 caracteres' })

    const [exists] = await pool.query('SELECT id FROM users WHERE username = ?', [u])
    if (exists.length > 0) {
      return res.status(409).json({ message: 'Ese usuario ya existe' })
    }

    const hash = await bcrypt.hash(String(password), 10)

    const [result] = await pool.query(
      'INSERT INTO users (username, password, name, role, is_active) VALUES (?, ?, ?, ?, 1)',
      [u, hash, name || '', role]
    )

    // devolvemos el creado (sin password)
    const [rows] = await pool.query(
      'SELECT id, username, name, role, is_active FROM users WHERE id = ?',
      [result.insertId]
    )

    const created = rows[0]
    return res.status(201).json({
      ...created,
      is_system: SYSTEM_USERS.has(String(created.username).toLowerCase())
    })
  } catch (err) {
    console.error('users.create error:', err)
    return res.status(500).json({ message: 'Error al crear usuario' })
  }
}

// PUT /api/users/:id
// body: { username, name, role, password? }
exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID inválido' })

    const { username, name, role, password } = req.body || {}

    const [rows] = await pool.query(
      'SELECT id, username FROM users WHERE id = ?',
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const currentUser = rows[0]
    const currentUsername = String(currentUser.username || '').toLowerCase()
    const newUsername = String(username || '').trim()

    if (!newUsername) {
      return res.status(400).json({ message: 'El username es requerido' })
    }

    if (newUsername.length < 3) {
      return res.status(400).json({ message: 'El usuario debe tener al menos 3 caracteres' })
    }

    // Si es cuenta del sistema, no permitir cambiar username
    if (isSystemUser(currentUser) && newUsername.toLowerCase() !== currentUsername) {
      return res.status(403).json({ message: 'No puedes cambiar el usuario de una cuenta del sistema' })
    }

    // Validar username repetido en otro usuario
    const [exists] = await pool.query(
      'SELECT id FROM users WHERE username = ? AND id <> ?',
      [newUsername, id]
    )

    if (exists.length > 0) {
      return res.status(409).json({ message: 'Ese usuario ya existe' })
    }

    if (password && String(password).trim().length > 0) {
      if (String(password).length < 4) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 4 caracteres' })
      }

      const hash = await bcrypt.hash(String(password), 10)

      await pool.query(
        'UPDATE users SET username = ?, name = ?, role = ?, password = ? WHERE id = ?',
        [newUsername, name || '', role || 'SALES', hash, id]
      )
    } else {
      await pool.query(
        'UPDATE users SET username = ?, name = ?, role = ? WHERE id = ?',
        [newUsername, name || '', role || 'SALES', id]
      )
    }

    const [updatedRows] = await pool.query(
      'SELECT id, username, name, role, is_active FROM users WHERE id = ?',
      [id]
    )

    const updated = updatedRows[0]

    return res.json({
      ...updated,
      is_system: SYSTEM_USERS.has(String(updated.username).toLowerCase())
    })
  } catch (err) {
    console.error('users.update error:', err)
    return res.status(500).json({ message: 'Error al actualizar usuario' })
  }
}

// PATCH /api/users/:id/active
// body: { is_active: 0 | 1 }
exports.setActive = async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID inválido' })

    const { is_active } = req.body || {}
    const active = Number(is_active) === 1 ? 1 : 0

    const [rows] = await pool.query(
      'SELECT id, username, is_active FROM users WHERE id = ?',
      [id]
    )
    if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' })

    // ✅ Regla: NO deshabilitar cuentas base (evita quedarte sin acceso)
    if (active === 0 && isSystemUser(rows[0])) {
      return res.status(403).json({ message: 'No puedes deshabilitar una cuenta del sistema' })
    }

    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [active, id])

    const [updatedRows] = await pool.query(
      'SELECT id, username, name, role, is_active FROM users WHERE id = ?',
      [id]
    )

    const updated = updatedRows[0]
    return res.json({
      ...updated,
      is_system: SYSTEM_USERS.has(String(updated.username).toLowerCase())
    })
  } catch (err) {
    console.error('users.setActive error:', err)
    return res.status(500).json({ message: 'Error al cambiar estado' })
  }
}

// PATCH /api/users/:id/password
// body: { password }
exports.changePassword = async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID inválido' })

    const { password } = req.body || {}
    if (!password || String(password).length < 4) {
      return res.status(400).json({ message: 'Password inválido (mínimo 4 caracteres)' })
    }

    const [rows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [id])
    if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' })

    const hash = await bcrypt.hash(String(password), 10)
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, id])

    return res.json({ ok: true })
  } catch (err) {
    console.error('users.changePassword error:', err)
    return res.status(500).json({ message: 'Error al cambiar contraseña' })
  }
}

// DELETE /api/users/:id
exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID inválido' })

    const [rows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [id])
    if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' })

    // ✅ Regla: NO borrar cuentas base
    if (isSystemUser(rows[0])) {
      return res.status(403).json({ message: 'No puedes eliminar una cuenta del sistema' })
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id])
    return res.json({ ok: true })
  } catch (err) {
    console.error('users.remove error:', err)
    return res.status(500).json({ message: 'Error al eliminar usuario' })
  }
}