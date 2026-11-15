# Auditoría técnica — Café Encuentro (2026-11)

Alcance: todo el repositorio (`backend/`, `frontend/`, configuración de Vercel, dependencias e historial de git).
Método: lectura completa del código, `npm audit`, ESLint, build, y **pruebas de integración contra MariaDB local**
(esquema inferido de las queries, porque el esquema de producción no está versionado) + **E2E con Playwright**.

> **Corrección de stack:** la base es **MySQL** (Aiven) vía `mysql2`, no PostgreSQL. Todo el SQL del proyecto es dialecto MySQL
> (`?` placeholders, `INSERT … VALUES ?`, códigos `ER_DUP_ENTRY`, etc.).

---

## 1. Discovery

### Arquitectura
```
Vercel (un proyecto, raíz = frontend/)
├── SPA React 19 + Vite + wouter ........ todo lo que no es /api/*
└── /api/* → frontend/api/index.js ...... re-exporta backend/index.js (Express 5) como 1 función serverless
                    │
                    └── mysql2/promise pool (limit 3, SSL) → MySQL en Aiven
                    └── Hugging Face (SD3) + MyMemory + Cloudinary (imágenes IA de productos)
```

| Módulo backend | Endpoints | Auth |
|---|---|---|
| auth | `POST /login`, `POST /registro`, `GET /verificar`, `GET /cajeras`, `PATCH /cambiar-password` | login público; resto token |
| pedidos | `POST /`, `GET /`, `GET /:id`, `PATCH /:id/entregar`, `PATCH /:id/cancelar`, `DELETE /:id` | token |
| pedidos (vistas) | `GET /cocina/activos`, `GET /cafeteria/activos`, `GET /destino/:id/activos`, `PATCH /items/:id/estado` | **público** |
| productos | `GET /`, `GET /menu`, `GET /:id`, `GET /stock-bajo` · `POST`, `PUT`, `PATCH /:id/stock`, `POST /:id/generar-imagen`, `DELETE` | lecturas públicas |
| categorias / destinos / acompanamientos | CRUD | lecturas públicas |
| registros | `GET /cocina`, `/cafeteria`, `/resumen`, `/cierre-caja` | token |

Flujo principal: **Caja** (`MenuCajera`) crea pedido → transacción descuenta stock → **Cocina/Cafetería** hacen polling cada 5 s y avanzan
estados por item → **Caja** (`ListaPedidosActivos`) ve "listo" y entrega o cancela (devolviendo stock) → **Registros** consulta historial.

Tablas (inferidas): `cajeras`, `categorias`, `destinos`, `productos`, `acompanamientos` (con `producto_vinculado_id` para compartir stock),
`productos_acompanamientos`, `pedidos` (PK `VARCHAR` tipo `P<timestamp>`), `pedidos_items`.

### Resumen
- **Complejidad técnica:** baja-media (≈2.600 líneas de React, ≈2.000 de backend). La complejidad real está en el stock compartido y la concurrencia.
- **Calidad general (antes):** estructura de carpetas clara y SQL parametrizado, pero lógica duplicada, código muerto, errores
  silenciosos, endpoints críticos sin protección y concurrencia incorrecta. Sin tests, sin esquema versionado, lockfile desincronizado, lint con 16 problemas.
- **Riesgos principales:** seguridad de acceso (registro público), integridad de stock (sobreventa) y conexiones del pool compartidas entre requests.

---

## 2-3. Hallazgos

Estado: ✅ corregido y validado · ⏳ pendiente (requiere decisión/acción fuera del código)

| # | Sev. | Área | Archivo : línea (original) | Problema y evidencia | Impacto | Solución | Estado |
|---|---|---|---|---|---|---|---|
| C1 | **Crítico** | Seguridad | `backend/api/auth/auth.routes.js:14` `router.post('/registro')` | Alta de cajeras **sin token**. Prueba: `POST /api/auth/registro` sin auth → **201 + token**. | Cualquiera en internet obtiene acceso total: borra pedidos, cambia precios/stock, crea usuarios. | `verificarToken` en la ruta (el AdminPanel ya enviaba token). | ✅ |
| C2 | **Crítico** | Backend / BD | `pedidos.controller.js:229-233` y `:284-289` `cancelar`, `eliminar` | `connection.release()` en `catch` **y** en `finally`. Con `mysql2` 3.15.3 (lockfile original) la conexión queda **dos veces** en la lista de libres. Prueba: tras 2 errores 404 → 4 conexiones "libres", 2 reales; luego 3 cajas simultáneas vendieron 9 u. con stock 5 → **stock -4**. | Requests concurrentes comparten conexión/transacción: `FOR UPDATE` deja de proteger, sobreventa, commits/rollbacks cruzados. | `utils/db.js → conTransaccion()` con un único `release()` en `finally`; aplicado a crear/cancelar/eliminar/entregar/cambiar estado. | ✅ |
| C3 | **Crítico** | Lógica de negocio | `pedidos.controller.js:51-95` `crear` | Stock validado **por línea** contra el valor original. Prueba: 2 líneas de 3 u. de un producto con stock 5 → 201 y **stock -1**; acompañamiento vinculado al mismo producto → **stock -2**. | Se venden productos inexistentes; inventario negativo. | Demanda **acumulada** por producto/acompañamiento (incluido stock vinculado) bajo `FOR UPDATE` de todas las filas; descuento único por fila. | ✅ |
| C4 | **Crítico** | Seguridad / Negocio | `pedidos.routes.js:13-18` `PATCH /items/:id/estado` | Público y aceptaba `Cancelado`/`Entregado` **sin devolver stock**, y podía "revivir" items de pedidos cancelados. | Cualquiera altera pedidos; stock y caja inconsistentes. | Endpoint público limitado a `Pendiente/En Preparación/Listo` (`ESTADOS_ITEM_COCINA`), rechaza items/pedidos finalizados, transacción con lock de cabecera. | ✅ |
| C5 | **Crítico** | Secretos | `backend/fix_password.js:7` | Contraseña de admin `'123456'` hardcodeada y commiteada. | Credencial conocida por cualquiera con acceso al repo/historial. | Script ahora pide la clave por argumento/env (mín. 8). **Rotar la clave real** (sigue en el historial de git). | ✅ código · ⏳ rotación |
| H1 | Alto | Negocio | `pedidos.controller.js:419-440` `marcarEntregado` | Entregaba pedidos **cancelados** (pasaban a "Completado"), sin transacción, N updates. | Caja cuenta como vendido algo cancelado/devuelto al stock. | Transacción + `FOR UPDATE`; 400 si está cancelado; un único `UPDATE`. | ✅ |
| H2 | Alto | Dependencias | `backend/package*.json`, `frontend/package*.json` | `npm audit`: backend 8 vulns (**1 crítica** proxy-addr, 5 altas: axios, body-parser, mysql2, path-to-regexp, form-data); frontend 3. Lockfile backend **desincronizado** (`cloudinary` faltante → `npm ci` fallaba). | DoS, SSRF, fuga de credenciales; builds no reproducibles. | `npm install` + `npm audit fix` (sin cambios mayores). **0 vulnerabilidades**. | ✅ |
| H3 | Alto | Admin | `categorias.routes.js`, `destinos.routes.js` | El panel hace `PUT /categorias/:id` y `PUT /destinos/:id` → **404** (no existían). | No se pueden editar categorías ni destinos. | Rutas + controllers con UPDATE parcial. | ✅ |
| H4 | Alto | Seguridad | `destinos.model.js:21-26` `actualizar` | Nombres de columna desde `req.body` interpolados: `` `${key} = ?` `` → inyección SQL. | Lectura/modificación arbitraria (p. ej. volcar `password_hash`). | Lista blanca de columnas. Prueba de inyección → rechazada. | ✅ |
| H5 | Alto | Backend | `destinos.model.js:28` `eliminar` | Stub vacío `{ /* ... */ }`: respondía "Destino desactivado" sin hacer nada. | Datos falsos de éxito. | `UPDATE destinos SET activo = 0` + 404 si no existe. | ✅ |
| H6 | Alto | Frontend UX | `MenuCajera.jsx:118`, `ListaPedidosActivos.jsx:441,453` | `alert(error.message)` → "Request failed with status code 400". | La cajera no sabe que falta stock ni por qué falló. | `mensajeError()` en `services/api.js`; backend siempre envía `mensaje`. E2E: "Stock insuficiente para "Cafe". Disponibles: 0…". | ✅ |
| H7 | Alto | Frontend Auth | `App.jsx`, `AuthContext.jsx:11-18`, `api.js` | Sin guarda de rutas (CLAUDE.md decía que redirigía, no lo hacía); usuario leído en `useEffect` (1er render siempre sin sesión); sin manejo de 401 → con token vencido nada funciona. | Pantallas rotas tras 2 días; flujo confuso. | `RutaProtegida`, lectura sincrónica, interceptor 401 → `/login`, verificación de sesión al iniciar. | ✅ |
| H8 | Alto | Funcional | `Registros.jsx:9,37-42` | `hoy = toISOString()` (UTC) y rangos "YYYY-MM-DD 00:00:00" interpretados en UTC. En Argentina desde las 21:00 el filtro abre en "mañana" y se pierden pedidos 21:00-23:59. | Historial/caja del día incompletos en eventos nocturnos. | Fecha local + límites del día local enviados como ISO; `normalizarFecha` en backend (compatible con el formato viejo). | ✅ (*) |
| M1 | Medio | Concurrencia | `helpers.js:7` `generarIdPedido` | `'P' + Date.now()`: 2 pedidos en el mismo ms → `ER_DUP_ENTRY` → 500. | Pedido perdido en horas pico. | ID monotónico por instancia + reintento ante duplicado. Prueba con 4 pedidos simultáneos. | ✅ |
| M2 | Medio | Concurrencia | `pedidos.controller.js:386-414` `cambiarEstadoItem` | Estado general recalculado sin transacción ni lock. | Estado general incorrecto con 2 pantallas simultáneas. | Transacción + `FOR UPDATE` de la cabecera. | ✅ |
| M3 | Medio | Performance | `productos.controller.js:22-30, 55-77` | N+1: una query de acompañamientos **por producto**, con pool de 3 conexiones. | Latencia del menú crece con el catálogo. | `obtenerAcompanamientosPorProductos` (1 query con `IN`). | ✅ |
| M4 | Medio | Backend | `pedidos.model.js:334-369` `contarTodos` | No aplicaba filtro `cliente`: `total` ≠ filas. | Paginación/totales incorrectos. | WHERE compartido (`construirFiltros`). | ✅ |
| M5 | Medio | Validación | `pedidos.controller.js:38,52` | `items` no validado como array; cantidades negativas → mensaje engañoso "Stock insuficiente". | Errores 500/confusos. | Validación explícita (array 1..50, enteros > 0, cliente ≤150). | ✅ |
| M6 | Medio | Validación | `productos.controller.js:186,276`, `productos.model.js:232` | Stock negativo/no numérico aceptado; `PUT` con solo `acompanamientos_ids` → **500**. | Inventario corrupto. | Validación numérica; ajuste con guarda `stock + ? >= 0`; modelo devuelve `false` sin campos. | ✅ |
| M7 | Medio | Seguridad | `backend/conexion.js:13-15` | `ssl.rejectUnauthorized: false`. | Posible MITM entre Vercel y Aiven. | Soporte `DB_CA_CERT` (verifica certificado). Sin la variable se mantiene el comportamiento anterior. | ✅ código · ⏳ configurar variable |
| M8 | Medio | Registros | `registros.model.js:157-185` `obtenerParaCierreCaja` | `GROUP BY … d.nombre` duplica pedidos con items en 2 destinos. | Cierre de caja sobrecontado. | `GROUP_CONCAT(DISTINCT d.nombre)`, agrupación por pedido. | ✅ |
| M9 | Medio | Registros | `registros.model.js:74-111` `obtenerResumenPorCajera` | Filtro de fecha en el `WHERE` convierte el `LEFT JOIN` en `INNER`. | Cajeras sin ventas desaparecen del resumen. | Filtros movidos al `ON`; `COALESCE(SUM,0)`. | ✅ |
| M10 | Medio | Frontend | `VistaCocina.jsx`/`VistaCafeteria.jsx` | ~200 líneas duplicadas; aviso sonoro por **conteo** (no suena si sale uno y entra otro); polling solapable. | Cocina no se entera de pedidos nuevos. | Hook `usePedidosDestino` (IDs vistos, sin solapamiento, sin setState tras desmontar). | ✅ |
| M11 | Medio | Seguridad | `auth.js` `verificarToken` | No consulta `activo`: una cajera desactivada sigue operando hasta 2 días. | Ex-colaboradores con acceso. | UI ahora valida sesión al iniciar (403 → logout). Validación por request: ver pendientes. | ⏳ parcial |
| M12 | Medio | Seguridad | `auth.controller.js` `login` | Sin rate limiting. | Fuerza bruta de contraseñas (6 caracteres mínimo). | Ver pendientes (en serverless requiere store compartido o regla de Vercel Firewall). | ⏳ |
| M13 | Medio | Autorización | todas las rutas `verificarToken` | No hay roles: toda cajera es admin (crear usuarios, borrar pedidos, precios). | Error humano o abuso interno. | Columna `rol` + middleware `requiereRol('admin')`. | ⏳ |
| L1 | Bajo | Frontend | `VistaCocina.jsx:93` `avanzarEstado` | Item "En Preparación" volvía a "Pendiente" (`indexOf` = -1 → `flujo[0]`). | Estado retrocede. | Mapa de transiciones explícito. | ✅ |
| L2 | Bajo | Frontend | `VistaMozos.jsx:277` | `precio` llega como string (`DECIMAL`): `toLocaleString` no formateaba. | Precios "1500.00". | `Number(precio)`. | ✅ |
| M14 | Medio | Funcional | `VistaMozos.jsx:19` `cargarInventario` | `GET /productos` sin filtro: productos **eliminados** (soft delete) con stock aparecían en el menú público. Verificado contra la API. | Mozos ofrecen productos dados de baja. | `params: { activo: true }`. | ✅ |
| L3 | Bajo | Calidad | `pedidos.model.js` | 9 funciones sin uso (incl. `crear`/`eliminar` **no transaccionales**); `hashSimple` inseguro en helpers; helper de destino duplicado (su `catch` devolvía 1 = Cocina también para Cafetería). | Riesgo de reutilizar código inseguro. | Eliminadas / centralizadas. | ✅ |
| L4 | Bajo | Calidad | `frontend` ESLint | 16 problemas (setState en effects, vars sin uso, `api/index.js` sin globals de Node). | Ruido; bugs ocultos. | 0 problemas. `ModalProducto` se reinicia por `key` en vez de `useEffect`. | ✅ |
| L5 | Bajo | Config | `.gitignore` | Marcadores de conflicto de merge (`<<<<<<<`) commiteados. | Confusión. | Resuelto (ambas listas). | ✅ |
| L6 | Bajo | Deps | `backend/package.json` | Dependencia npm `path` (es módulo nativo). | Superficie innecesaria. | Eliminada. | ✅ |
| L7 | Bajo | BD | (esquema no versionado) | No hay DDL ni migraciones en el repo; no se pueden auditar FKs/índices reales. | Imposible reconstruir la BD; drift. | `backend/sql/2026_11_indices_recomendados.sql` (verificado con `EXPLAIN` localmente). Versionar el DDL. | ⏳ |
| L8 | Bajo | Seguridad | `index.js:13` `cors()`; rutas públicas `GET /pedidos/*/activos`, `/productos/stock-bajo` | CORS abierto; nombres de clientes visibles sin login. | Exposición menor de datos. | Restringir CORS al dominio; evaluar PIN para pantallas de cocina. | ⏳ |
| L9 | Bajo | Express 5 | `validator.js:175-180` `sanitizar` | `req.query` es getter en Express 5: el trim de query no tiene efecto. Nombre "prevenir inyecciones" engañoso (la protección real es el SQL parametrizado). | Falsa sensación de seguridad. | Documentado. | ⏳ |

(*) Supone que la sesión MySQL de Aiven está en UTC (default de Aiven). Verificar con `SELECT @@global.time_zone, @@session.time_zone;`.

**XSS:** no se encontraron sinks (`dangerouslySetInnerHTML`, `innerHTML`, `eval`); React escapa todo el texto. **SQL injection:** todo el SQL usa
placeholders salvo el caso H4 (corregido). **Secretos en git:** escaneado todo el historial (50 commits): no hay `.env` commiteados; el único secreto real era C5.

---

## 4. Backlog priorizado (por valor de negocio)

| # | Tarea | Impacto | Riesgo | Complejidad | Dependencias | Tiempo |
|---|---|---|---|---|---|---|
| 1 | **Desplegar esta rama** (corrige C1-C5, H1-H8, M1-M10) | Muy alto | Bajo (32 pruebas de integración + 11 E2E) | — | Revisión del PR | 30 min |
| 2 | **Rotar** contraseña de `admin` (`node fix_password.js "<nueva>"`) y **`JWT_SECRET`** en Vercel (invalida tokens emitidos vía registro público) | Muy alto | Bajo (todos re-loguean) | Baja | 1 | 15 min |
| 3 | Revisar usuarios en `cajeras` y desactivar los no reconocidos (posibles altas vía C1) | Alto | Bajo | Baja | 1 | 15 min |
| 4 | Configurar `DB_CA_CERT` en Vercel (CA de Aiven) | Medio | Bajo | Baja | — | 15 min |
| 5 | Verificar zona horaria de la sesión MySQL en Aiven | Medio | Bajo | Baja | — | 10 min |
| 6 | Aplicar índices de `backend/sql/2026_11_indices_recomendados.sql` tras `SHOW INDEX` | Medio | Bajo | Baja | — | 20 min |
| 7 | Rol `admin` vs `cajera` (`/admin`, `/auth/registro`, borrar pedidos, productos) | Alto | Medio | Media | Migración `ALTER TABLE cajeras ADD rol` | 4-6 h |
| 8 | Rate limiting de `/auth/login` (Vercel Firewall rule o KV) | Medio | Bajo | Baja-Media | — | 1-2 h |
| 9 | Chequear `activo` en `verificarToken` (con caché corta) | Medio | Bajo | Baja | — | 1 h |
| 10 | Versionar DDL completo + migraciones | Medio | Bajo | Media | Acceso a BD | 2-3 h |
| 11 | Llevar la suite de integración al repo + CI (GitHub Actions con servicio MySQL) | Alto (previene regresiones) | Bajo | Media | 10 | 3-4 h |
| 12 | Restringir CORS + PIN para pantallas públicas | Bajo | Bajo | Baja | — | 1-2 h |

---

## 5-6. Ejecución y validación

**Pruebas de integración** (MariaDB local, esquema inferido): línea base sobre el código original → falla C1 (201 sin token) y C3
(stock -1 / -2) antes de corromper el resto. Tras las correcciones: **32/32 OK**. Prueba específica de C2 + concurrencia con `mysql2` 3.15.3:

| Escenario | Original | Corregido |
|---|---|---|
| Conexiones libres tras 2 errores 404 | 4 (2 duplicadas) | 2 |
| 3 cajas × 3 u. simultáneas, stock 5 | 201,201,201 → **stock -4** | 201,400,400 → stock 2 |

**E2E (Playwright, Vite + backend + MariaDB): 11/11** — guarda de rutas, login, pedido con acompañamiento obligatorio, mensaje de stock
insuficiente legible, cocina recibe y marca listo, caja entrega, registros del día, token vencido → login, sin errores JS.

**Regresión:** ESLint 0 problemas (antes 16) · `vite build` OK · `npm audit` 0 vulnerabilidades en ambos paquetes · sin imports rotos ni
referencias huérfanas (grep de cada función eliminada) · todos los módulos del backend cargan.

**Compatibilidad de API:** sin cambios de contrato para el frontend existente, salvo lo intencional: `POST /auth/registro` exige token;
`PATCH /items/:id/estado` solo acepta estados de cocina; respuestas de error agregan `mensaje`; `cierre-caja.destino_nombre` puede listar varios destinos.

---

## Scores

| Dimensión | Antes | Después | Justificación |
|---|---|---|---|
| Arquitectura | 5 | 6.5 | Módulos por dominio claros y despliegue simple; ahora con capa transaccional y helpers compartidos. Falta capa de servicios, roles y esquema versionado. |
| Seguridad | 2.5 | 6.5 | Registro público, inyección y estados públicos cerrados; 0 vulns. Faltan roles, rate limiting, rotación de secretos y CA. |
| Mantenibilidad | 4 | 6.5 | Duplicaciones y código muerto eliminados, lint limpio, lockfile sano, CLAUDE.md al día. Sin tests en el repo. |
| Performance | 5.5 | 7 | N+1 eliminado, polling sin solapamiento, requests en paralelo, índices propuestos. |
| Escalabilidad | 5 | 6 | Adecuada al volumen de una iglesia. Polling cada 5 s por pantalla + pool de 3 por instancia serverless limita el crecimiento. |

## Listas finales

**Corregidos:** C1, C2, C3, C4, C5 (código), H1-H8, M1-M10, M14, L1-L6.

**Pendientes:** rotación de secretos (C5) · `DB_CA_CERT` (M7) · `activo` por request (M11) · rate limiting (M12) · roles (M13) · esquema versionado e índices en prod (L7) · CORS / PIN de pantallas (L8) · `sanitizar` (L9).

**Quick wins (< 30 min c/u):** rotar admin + `JWT_SECRET` · revisar tabla `cajeras` · `DB_CA_CERT` · aplicar índices · verificar zona horaria de Aiven.

**Mejoras futuras:** roles · tests + CI · SSE/WebSocket (o Supabase/Pusher) en lugar de polling · validación de que el acompañamiento pertenezca al producto · paginación real en Registros (hoy hasta 1000) · TypeScript o JSDoc tipado en el backend.

**Deuda técnica restante:** sin capa de servicios (controllers con SQL transaccional) · helpers/validators sin uso (`formatearPrecio`, `validarEmail`, etc.) · estilos inline extensos en `Login.jsx` · sin esquema/migraciones · JWT en `localStorage` (aceptable sin sinks XSS, pero revisar si se agregan).
