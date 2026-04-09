# 📋 Registro de Cambios — SolarSur

## 🗄️ Base de Datos
- Ejecutar `MIGRACION_BD.sql` en tu servidor MySQL
- Agrega: `dni`, `ruc`, `email`, `district`, `city` a tabla `clients`
- Verifica que `audit_logs` esté creada (ya estaba en el schema original)

## 🔐 Permisos por rol

| Sección | SUPERADMIN | ADMIN | SALES | WAREHOUSE |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Ventas | ✅ | ✅ | ✅ | ❌ |
| Clientes | ✅ | ✅ edit | ✅ ver | ✅ ver |
| Proveedores | ✅ | ✅ | ❌ | ❌ |
| Inventario | ✅ | ✅ | ✅ ver | ✅ |
| Almacén | ✅ | ✅ | ❌ | ✅ |
| Cotización | ✅ | ✅ | ✅ | ❌ |
| Historial | ✅ | ✅ | ✅ ver | ❌ |
| **Usuarios** | ✅ | ❌ | ❌ | ❌ |
| **Auditoría** | ✅ | ❌ | ❌ | ❌ |
| Perfil empresa | ✅ | ✅ | ❌ | ❌ |

## 🆕 Funcionalidades nuevas

### Editor de cotización (modal)
- En Cotizaciones, el botón "✏️ Editar y exportar PDF" abre un editor completo
- Puedes editar: cliente, número de cotización, descripción de cada item, cantidades, precios
- Agregar o eliminar filas antes de exportar
- Configurar IGV (0% o 18%)
- Editar la nota al pie / condiciones
- El PDF incluye ahora DNI/RUC/email/dirección completa del cliente

### Clientes ampliados
- Nuevos campos: DNI, RUC, Email, Dirección, Distrito, Ciudad/Provincia
- Aparecen en el formulario lateral y en la tabla
- Todos los datos del cliente aparecen en la cotización PDF

### Auditoría (solo SUPERADMIN)
- Nueva sección "🔍 Auditoría" visible solo para SUPERADMIN
- Registra: LOGIN, LOGOUT de usuarios
- Filtros por tipo de acción y módulo
- Muestra usuario, fecha, hora, IP

## 📁 Archivos modificados

### Backend
- `controllers/clientsController.js` — soporte DNI, RUC, email, distrito, ciudad
- `controllers/auditController.js` — NUEVO — lista logs y función helper `log()`
- `controllers/auth.controller.js` — registra LOGIN/LOGOUT en audit_logs
- `routes/audit.routes.js` — NUEVO — solo SUPERADMIN
- `routes/auth.routes.js` — agrega ruta POST /logout
- `routes/users.routes.js` — cambiado a solo SUPERADMIN (antes ADMIN también podía)
- `server.js` — agrega `/api/audit`

### Frontend
- `components/Header.jsx` — permisos por rol correctos
- `components/Clients.jsx` — campos DNI, RUC, email, distrito, ciudad; readonly para SALES/WAREHOUSE
- `components/Quotes.jsx` — editor modal con edición en vivo antes de exportar PDF
- `components/AuditLog.jsx` — NUEVO — página de auditoría para SUPERADMIN
- `utils/printQuote.js` — soporte IGV, nota editable, campos completos de cliente
- `context/AuthContext.jsx` — llama API logout para registrar en auditoría
- `App.jsx` — agrega sección audit con guard de rol
