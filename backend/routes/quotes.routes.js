const express = require('express')
const router = express.Router()
const quotesController = require('../controllers/quotesController')

router.get('/', quotesController.getQuotes)
router.post('/', quotesController.createQuote)
router.delete('/:id', quotesController.deleteQuote)

module.exports = router