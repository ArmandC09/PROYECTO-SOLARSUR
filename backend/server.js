const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
require('dotenv').config()

const authRoutes = require('./routes/auth.routes')
const clientsRoutes = require('./routes/clients.routes')
const inventoryRoutes = require('./routes/inventory.routes')
const providersRoutes = require('./routes/providers.routes')
const quotesRoutes = require('./routes/quotes.routes')
const salesRoutes = require('./routes/sales.routes')
const companyRoutes = require('./routes/company.routes')
const usersRoutes = require('./routes/users.routes')
const movementsRoutes = require('./routes/movements.routes')
const auditRoutes = require('./routes/audit.routes')
const kitsRoutes   = require('./routes/kits.routes')

const app = express()

// ============ SEGURIDAD ============
app.use(helmet())

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('CORS: origen no permitido'))
  },
  credentials: true
}))
// ===================================

app.use(express.json({ limit: '10mb' }))

// ================= ROUTES =================

app.use('/api/auth', authRoutes)
app.use('/api/clients', clientsRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/providers', providersRoutes)
app.use('/api/quotes', quotesRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/company', companyRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/movements', movementsRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/kits',  kitsRoutes)

// ==========================================

app.listen(process.env.PORT, () => {
  console.log(`Servidor corriendo en puerto ${process.env.PORT}`)
})
