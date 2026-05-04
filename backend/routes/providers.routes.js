const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth.middleware')
const providersController = require('../controllers/providersController')

router.get('/', auth, providersController.getProviders)
router.post('/', auth, providersController.createProvider)
router.put('/:id', auth, providersController.updateProvider)
router.delete('/:id', auth, providersController.deleteProvider)

module.exports = router
