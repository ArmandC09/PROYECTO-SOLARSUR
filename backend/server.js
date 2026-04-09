const express = require('express')
const cors = require('cors')
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

const app = express()

app.use(cors())
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

// ==========================================

app.listen(process.env.PORT, () => {
  console.log(`Servidor corriendo en puerto ${process.env.PORT}`)
})
