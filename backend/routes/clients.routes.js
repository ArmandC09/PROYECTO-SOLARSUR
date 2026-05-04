const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth.middleware')
const clientsController = require('../controllers/clientsController')

router.get('/', auth, clientsController.getClients)
router.post('/', auth, clientsController.createClient)
router.put('/:id', auth, clientsController.updateClient)
router.delete('/:id', auth, clientsController.deleteClient)

module.exports = router
