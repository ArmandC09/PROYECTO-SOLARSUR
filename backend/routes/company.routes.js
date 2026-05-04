const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth.middleware')
const companyController = require('../controllers/companyController')

router.get('/', companyController.getCompany)         // GET es público (lo usa el Login para el logo)
router.put('/', auth, companyController.updateCompany) // PUT requiere autenticación

module.exports = router
