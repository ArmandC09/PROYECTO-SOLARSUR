const express = require('express')
const router = express.Router()
const clientsController = require('../controllers/clientsController')

router.get('/', clientsController.getClients)
router.post('/', clientsController.createClient)
router.put('/:id', clientsController.updateClient)
router.delete('/:id', clientsController.deleteClient)

module.exports = router