const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth.middleware')
const inventoryController = require('../controllers/inventoryController')

router.get('/', auth, inventoryController.getInventory)
router.post('/', auth, inventoryController.createInventory)
router.put('/:id', auth, inventoryController.updateInventory)
router.delete('/:id', auth, inventoryController.deleteInventory)

module.exports = router
