const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth.middleware')
const kitsController = require('../controllers/kitsController')

router.get('/',       auth, kitsController.getKits)
router.post('/',      auth, kitsController.createKit)
router.put('/:id',    auth, kitsController.updateKit)
router.delete('/:id', auth, kitsController.deleteKit)

module.exports = router
