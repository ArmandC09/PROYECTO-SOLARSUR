const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth.middleware')
const quotesController = require('../controllers/quotesController')

router.get('/', auth, quotesController.getQuotes)
router.post('/', auth, quotesController.createQuote)
router.delete('/:id', auth, quotesController.deleteQuote)

module.exports = router
