// middleware/auth.middleware.js
const jwt = require('jsonwebtoken')

module.exports = function auth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) {
      return res.status(401).json({ message: 'Token requerido' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded // { id, username, role, name? }
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' })
  }
}