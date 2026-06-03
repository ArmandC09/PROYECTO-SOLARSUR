const express = require('express')
const router = express.Router()
const authController = require('../controllers/auth.controller')
const auth = require('../middleware/auth.middleware')
const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { message: 'Demasiados intentos. Intenta en 3 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
})

router.post('/login', loginLimiter, authController.login)
router.post('/logout', auth, authController.logout)

module.exports = router
