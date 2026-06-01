const pool = require('../db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { log } = require('./auditController')

exports.login = async (req, res) => {
  const { username, password } = req.body

  // Validación básica de entrada
  if (!username || !password) return res.status(400).json({ message: 'Credenciales requeridas' })
  if (typeof username !== 'string' || typeof password !== 'string')
    return res.status(400).json({ message: 'Formato inválido' })
  if (username.length > 50 || password.length > 100)
    return res.status(400).json({ message: 'Datos demasiado largos' })
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null
  const ua = req.headers['user-agent'] || null

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username])

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales incorrectas' })
    }

    const user = rows[0]

    if (user.is_active === 0) {
      return res.status(403).json({ message: 'Cuenta deshabilitada' })
    }

    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciales incorrectas' })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    await log({ user_id: user.id, action: 'LOGIN', entity: 'users', entity_id: user.id, ip, user_agent: ua })

    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    })

  } catch (error) {
    console.error('LOGIN ERROR:', error)
    res.status(500).json({ message: 'Error del servidor' })
  }
}

exports.logout = async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null
  const ua = req.headers['user-agent'] || null
  const userId = req.user?.id

  if (userId) {
    await log({ user_id: userId, action: 'LOGOUT', entity: 'users', entity_id: userId, ip, user_agent: ua })
  }

  res.json({ ok: true })
}
