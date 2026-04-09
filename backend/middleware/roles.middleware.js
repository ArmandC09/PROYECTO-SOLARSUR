// middleware/roles.middleware.js
module.exports = function requireRoles(...allowed) {
  return (req, res, next) => {
    const role = req.user?.role
    if (!role) return res.status(401).json({ message: 'No autenticado' })

    if (!allowed.includes(role)) {
      return res.status(403).json({ message: 'No autorizado' })
    }
    next()
  }
}