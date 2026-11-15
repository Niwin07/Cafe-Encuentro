# Auditoría técnica — Café Encuentro (2026-11)

**Rama auditada:** `claude/frontend-rebuild` (la que estaba desplegada en producción en Vercel), que pasa a ser `main`.
**Stack real:** React 19 + Vite + Tailwind (frontend) · Express 5 en una función serverless de Vercel · **PostgreSQL en Aiven** (`pg`, con una capa de compatibilidad estilo mysql2 en `backend/conexion.js`).

**Método:** lectura del código, `npm audit`, ESLint, build, **pruebas de integración contra PostgreSQL 16 local** (esquema real de `backend/sql/schema.js`, creado por la propia app) y **E2E con Playwright**. La misma suite se corrió sobre el código de producción (línea base) y sobre el corregido.

---

## 1. Discovery

```
Vercel (raíz = frontend/)
├── SPA React (wouter, Tailwind, componentes ui/*) ...... todo lo que no es /api/*
├── /api/* → frontend/api/index.js → backend/index.js (Express 5, 1 función)
│      └── conexion.js: pool pg (max 3, SSL) + traductor mysql2→pg + auto-esquema
├── Cron diario → /api/keepalive (Aiven apaga la base gratuita si no hay actividad)
└── GitHub Actions cada 6 h → /api/keepalive (respaldo)
```

Flujo: Caja crea pedido (transacción + stock) → Cocina/Cafetería (`TableroDestino`, polling 5 s) avanzan estados → Caja entrega o cancela (devuelve stock) → Registros.

**Complejidad:** baja-media. **Calidad antes:** buena base visual y de estructura (frontend reconstruido, guarda de rutas, interceptor 401, esquema versionado, capa pg que ya evitaba el doble `release`), pero con los mismos huecos críticos de seguridad y de stock que el backend original.

---

## 2-3. Hallazgos

✅ corregido y probado · ⏳ pendiente (acción manual o decisión)

| # | Sev. | Área | Archivo / función | Problema y evidencia | Impacto | Solución | Estado |
|---|---|---|---|---|---|---|---|
| C1 | **Crítico** | Seguridad | `auth.routes.js` `POST /registro` | Público. Línea base: sin token → **201 + token**. | Cualquiera obtiene acceso total. | `verificarToken` (el panel ya enviaba token). | ✅ |
| C2 | **Crítico** | Secretos | `sql/schema.js` (seed) y `fix_password.js` | Si `cajeras` está vacía se crea **admin / 123456** con un hash fijo publicado en el repo; `fix_password.js` también fija `123456`. Línea base: login `admin/123456` → 200. | Credencial de administrador conocida. | Seed eliminado; `conexion.js` crea admin solo desde `ADMIN_PASSWORD` (≥ 8). `fix_password.js` pide la clave por argumento. **Rotar la clave real.** | ✅ código · ⏳ rotación |
| C3 | **Crítico** | Stock | `pedidos.controller.js` `crear` | Stock validado por línea. Línea base: 3 + 3 de un producto con stock 5 → **stock -1**; acompañamiento vinculado al mismo producto → **-2**. | Sobreventa e inventario negativo. | Demanda acumulada por producto/acompañamiento bajo `FOR UPDATE`; descuento único por fila. | ✅ |
| C4 | **Crítico** | Seguridad / Negocio | `pedidos.routes.js` `PATCH /items/:id/estado` | Público y aceptaba `Cancelado`/`Entregado` sin devolver stock; podía revivir items cancelados. | Cualquiera altera pedidos y caja. | Solo `Pendiente/En Preparación/Listo` sobre items activos, transacción con lock de cabecera. | ✅ |
| H1 | Alto | Negocio | `marcarEntregado` | Entregaba pedidos cancelados (→ "Completado"), sin transacción. | Caja cuenta ventas devueltas. | Transacción + 400 si está cancelado. | ✅ |
| H2 | Alto | Admin | `categorias.routes.js`, `destinos.routes.js` | El panel hace `PUT /categorias/:id` y `PUT /destinos/:id` → **404**. | No se pueden editar. | Rutas + UPDATE parcial. | ✅ |
| H3 | Alto | Seguridad | `destinos.model.js` `actualizar` | Claves de `req.body` interpoladas como columnas → inyección SQL. | Lectura/modificación arbitraria. | Lista blanca. | ✅ |
| H4 | Alto | Backend | `destinos.model.js` `eliminar` | Stub vacío: respondía "desactivado" sin hacer nada. | Datos falsos de éxito. | `activo = FALSE` + 404. | ✅ |
| H5 | Alto | Dependencias | `package-lock.json` (ambos) | `npm audit` con vulnerabilidades altas/críticas (axios, body-parser, path-to-regexp, proxy-addr, qs, form-data…). | DoS, SSRF. | `npm audit fix` (sin cambios mayores) → **0**. Se quita la dependencia `path`. | ✅ |
| M1 | Medio | Concurrencia | `helpers.js` `generarIdPedido` | `'P' + Date.now()` colisiona en el mismo ms → 500. | Pedidos perdidos en hora pico. | ID monotónico + `INSERT … ON CONFLICT DO NOTHING` y reintento (en Postgres un error aborta la transacción). | ✅ |
| M2 | Medio | Concurrencia | `cambiarEstadoItem` | Estado general recalculado sin lock. | Estado general incorrecto. | Transacción + `FOR UPDATE`. | ✅ |
| M3 | Medio | Performance | `productos.controller.js` listados | N+1: una query de acompañamientos por producto (pool de 3). | Menú lento. | 1 query con `IN`. | ✅ |
| M4 | Medio | Backend | `pedidos.model.js` `contarTodos` | Ignoraba filtro `cliente`. | Totales incorrectos. | WHERE compartido. | ✅ |
| M5 | Medio | Validación | `crear`, productos | Items no-array, cantidades/stock negativos, `PUT` solo con acompañamientos → 500. | Errores y datos corruptos. | Validaciones explícitas. | ✅ |
| M6 | Medio | Seguridad | `conexion.js` | `ssl.rejectUnauthorized: false`. | MITM Vercel↔Aiven. | `DB_CA_CERT` opcional valida el certificado. | ✅ código · ⏳ variable |
| M7 | Medio | Registros | `obtenerParaCierreCaja`, `obtenerResumenPorCajera` | Pedidos con items en 2 destinos duplicados; filtro de fecha en WHERE anulaba el LEFT JOIN. | Cierre de caja/resúmenes erróneos. | `STRING_AGG`, filtros en el `ON`. | ✅ |
| M8 | Medio | Frontend | `TableroDestino.jsx` | Cocina: ítem "En Preparación" volvía a "Pendiente" (`indexOf` = -1); aviso sonoro por conteo (no suena si sale uno y entra otro); polling solapable; error genérico. | Cocina no se entera / estado retrocede. | Avance explícito, aviso por IDs nuevos, guarda de request en curso, mensaje real. | ✅ |
| M9 | Medio | Frontend | `VistaMozos.jsx` | `GET /productos` sin filtro: productos eliminados con stock en el menú público. | Se ofrecen productos dados de baja. | `activo=true`. | ✅ |
| M10 | Medio | Frontend | `Registros.jsx` | "Hoy" calculado en UTC: desde las 21:00 abre el día siguiente. (El backend ya interpretaba bien las fechas por la zona de la sesión.) | Historial del evento vacío de noche. | Fecha local. | ✅ |
| M11 | Medio | Seguridad | `auth.js` | No revisa `activo` en cada request (el front sí verifica al iniciar). | Cajera desactivada opera hasta 2 días. | Chequeo por request con caché. | ⏳ |
| M12 | Medio | Seguridad | `/auth/login` | Sin rate limiting. | Fuerza bruta. | Regla de Vercel Firewall o KV. | ⏳ |
| M13 | Medio | Autorización | todas | Sin roles: toda cajera es admin. | Abuso/errores internos. | Columna `rol` + middleware. | ⏳ |
| L1 | Bajo | Calidad | `pedidos.model.js`, `helpers.js` | 9 funciones muertas (incl. escrituras no transaccionales), `hashSimple`, helper de destino duplicado. | Riesgo de reuso. | Eliminadas / centralizadas. | ✅ |
| L2 | Bajo | Calidad | ESLint | 3 errores (`api/index.js` sin globals de Node; `Modal` escribía un ref durante el render). | — | 0 problemas. | ✅ |
| L3 | Bajo | Operación | `api/keepalive` | Sin `CRON_SECRET` el endpoint es público (escrituras ilimitadas). | Abuso menor. | Definir `CRON_SECRET`. | ⏳ |
| L4 | Bajo | Performance | `conexion.js` `asegurarEsquema` | El DDL completo corre en cada arranque en frío. | Latencia del primer request. | `DB_AUTO_SCHEMA=false` en producción una vez creada la base. | ⏳ |
| L5 | Bajo | Seguridad | `index.js` `cors()` | CORS abierto (el front usa mismo dominio). | Menor. | Restringir origen. | ⏳ |

Sin sinks de XSS (`dangerouslySetInnerHTML`, `innerHTML`, `eval`). Todo el SQL es parametrizado salvo H3 (corregido).

---

## 4. Backlog (por valor de negocio)

| # | Tarea | Impacto | Riesgo | Complejidad | Tiempo |
|---|---|---|---|---|---|
| 1 | Merge a `main` y Production Branch de Vercel = `main` | Muy alto | Bajo | Baja | 10 min |
| 2 | Rotar contraseña admin (`node backend/fix_password.js "<nueva>"`) y `JWT_SECRET` | Muy alto | Bajo (re-login) | Baja | 15 min |
| 3 | Revisar `cajeras` y desactivar desconocidas | Alto | Bajo | Baja | 15 min |
| 4 | `DB_CA_CERT` y `CRON_SECRET` en Vercel | Medio | Bajo | Baja | 15 min |
| 5 | Roles admin/cajera | Alto | Medio | Media | 4-6 h |
| 6 | Rate limiting de login | Medio | Bajo | Baja | 1-2 h |
| 7 | `activo` por request | Medio | Bajo | Baja | 1 h |
| 8 | Suite de integración + CI (GitHub Actions con servicio Postgres) | Alto | Bajo | Media | 3-4 h |

---

## 5-6. Validación

| Prueba | Producción (antes) | Corregido |
|---|---|---|
| Integración PostgreSQL (34 casos) | admin/123456 entra · registro público 201 · stock -1 y -2 (la suite se corta ahí) | **34/34** |
| 3 cajas × 3 u. simultáneas, stock 5 | — | 201,400,400 → stock 2 |
| E2E Playwright (13 casos) | — | **13/13** |
| ESLint | 3 errores | 0 |
| `npm audit` | vulnerabilidades altas/críticas | 0 |

Cambios de contrato intencionales: `POST /auth/registro` exige token; `PATCH /items/:id/estado` solo estados de cocina; errores siempre con `mensaje`; `cierre-caja.destino_nombre` puede listar varios destinos.

## Scores

| Dimensión | Antes | Después |
|---|---|---|
| Arquitectura | 6 | 7 |
| Seguridad | 3 | 6.5 |
| Mantenibilidad | 6 | 7 |
| Performance | 6 | 7 |
| Escalabilidad | 5.5 | 6 |

**Deuda restante:** sin capa de servicios; capa de traducción mysql2→pg (funciona, pero conviene migrar a SQL nativo de Postgres con `$n`); polling en lugar de tiempo real; sin tests en el repo; sin roles.
