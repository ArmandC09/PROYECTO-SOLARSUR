const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth.controller')
const auth = require('../middleware/auth.middleware')

router.post('/login', authController.login)
router.post('/logout', auth, authController.logout)

module.exports = router
