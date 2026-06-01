// ── middleware/sanitize.js ────────────────────────────────────────────────
// Protección contra inputs maliciosos en todas las rutas POST/PUT
// Aplica: límite de caracteres, trim, bloqueo de patrones peligrosos

const RULES = {
  // Auth
  username:         { max: 50,   type: 'text' },
  password:         { max: 100,  type: 'text' },
  // Clientes
  name:             { max: 120,  type: 'text' },
  phone:            { max: 20,   type: 'text' },
  address:          { max: 200,  type: 'text' },
  dni:              { max: 8,    type: 'numeric' },
  ruc:              { max: 11,   type: 'numeric' },
  email:            { max: 120,  type: 'email' },
  district:         { max: 80,   type: 'text' },
  city:             { max: 80,   type: 'text' },
  // Inventario
  sku:              { max: 50,   type: 'text' },
  qty:              { max: null, type: 'number' },
  price:            { max: null, type: 'number' },
  provider_id:      { max: null, type: 'number' },
  // Proveedores
  contact:          { max: 100,  type: 'text' },
  // Kits / Cotizaciones
  description:      { max: 250,  type: 'text' },
  note:             { max: 300,  type: 'text' },
  total:            { max: null, type: 'number' },
  client_id:        { max: null, type: 'number' },
  // Empresa
  ruc2:             { max: 11,   type: 'text' },
  // Usuarios
  role:             { max: 20,   type: 'text' },
  // Movimientos
  type:             { max: 10,   type: 'text' },
  inventory_id:     { max: null, type: 'number' },
  // Ventas
  discount:         { max: null, type: 'number' },
  discount_type:    { max: 10,   type: 'text' },
  discount_reason:  { max: 120,  type: 'text' },
  source_quote_id:  { max: null, type: 'number' },
}

// Patrones peligrosos — SQL injection y script injection básicos
const DANGEROUS = [
  /<script[\s\S]*?>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,            // onclick= onerror= etc
  /'\s*(or|and)\s*'?\d/i,  // ' OR '1'='1
  /;\s*drop\s+table/i,
  /union\s+select/i,
  /--\s*$/m,
  /\/\*[\s\S]*?\*\//,
]

function isSafe(val) {
  if (typeof val !== 'string') return true
  return !DANGEROUS.some(re => re.test(val))
}

function sanitizeValue(key, val) {
  if (val === null || val === undefined || val === '') return val

  const rule = RULES[key]

  // Strings
  if (typeof val === 'string') {
    const trimmed = val.trim()

    // Bloquear patrones peligrosos
    if (!isSafe(trimmed)) return null   // se descarta el campo

    // Aplicar límite de caracteres
    if (rule?.max && trimmed.length > rule.max) return trimmed.slice(0, rule.max)

    // Validar tipo numérico declarado como string
    if (rule?.type === 'numeric' && trimmed !== '' && !/^\d+$/.test(trimmed)) return null

    return trimmed
  }

  // Arrays (items de cotizaciones/kits) — limpiar cada string dentro
  if (Array.isArray(val)) {
    return val.map(item => {
      if (typeof item === 'object' && item !== null) {
        const clean = {}
        for (const [k, v] of Object.entries(item)) {
          clean[k] = sanitizeValue(k, v)
        }
        return clean
      }
      return item
    })
  }

  return val
}

function sanitizeBody(req, res, next) {
  if (!req.body || typeof req.body !== 'object') return next()

  const cleaned = {}
  for (const [key, val] of Object.entries(req.body)) {
    cleaned[key] = sanitizeValue(key, val)
  }
  req.body = cleaned
  next()
}

module.exports = sanitizeBody
