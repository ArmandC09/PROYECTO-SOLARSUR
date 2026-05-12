const express = require('express')
const router = express.Router()
const salesController = require('../controllers/salesController')
const auth = require('../middleware/auth.middleware')
const requireRoles = require('../middleware/roles.middleware')

router.get('/', auth, requireRoles('SUPERADMIN', 'ADMIN', 'SALES'), salesController.getSales)
router.post('/', auth, requireRoles('SUPERADMIN', 'ADMIN', 'SALES'), salesController.createSale)
router.post('/:id/revert', auth, requireRoles('SUPERADMIN', 'ADMIN'), salesController.revertSale)
router.delete('/:id', auth, requireRoles('SUPERADMIN', 'ADMIN'), salesController.deleteSale)

module.exports = router
