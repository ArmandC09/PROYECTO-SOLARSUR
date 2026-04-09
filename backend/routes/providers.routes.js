const express = require('express')
const router = express.Router()
const providersController = require('../controllers/providersController')

router.get('/', providersController.getProviders)
router.post('/', providersController.createProvider)
router.put('/:id', providersController.updateProvider)
router.delete('/:id', providersController.deleteProvider)

module.exports = router