const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth.middleware')
const requireRoles = require('../middleware/roles.middleware')
const auditCtrl = require('../controllers/auditController')

// Solo SUPERADMIN puede ver el log de auditoría
router.use(auth, requireRoles('SUPERADMIN'))
router.get('/', auditCtrl.list)

module.exports = router
