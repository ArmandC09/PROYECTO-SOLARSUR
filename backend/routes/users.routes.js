const express = require('express')
const router = express.Router()

const auth = require('../middleware/auth.middleware')
const requireRoles = require('../middleware/roles.middleware')
const users = require('../controllers/users.controller')

// Solo SUPERADMIN puede gestionar usuarios
router.use(auth, requireRoles('SUPERADMIN'))

router.get('/', users.list)
router.post('/', users.create)
router.put('/:id', users.update)
router.patch('/:id/active', users.setActive)
router.patch('/:id/password', users.changePassword)
router.delete('/:id', users.remove)

module.exports = router
