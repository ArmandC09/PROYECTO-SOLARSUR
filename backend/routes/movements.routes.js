const express = require('express')
const router = express.Router()

const auth = require('../middleware/auth.middleware')
const requireRoles = require('../middleware/roles.middleware')

const movementsController = require('../controllers/movements.controller')

// WAREHOUSE + ADMIN + SUPERADMIN
router.get('/', auth, requireRoles('WAREHOUSE','ADMIN','SUPERADMIN'), movementsController.getMovements)
router.post('/', auth, requireRoles('WAREHOUSE','ADMIN','SUPERADMIN'), movementsController.createMovement)

module.exports = router