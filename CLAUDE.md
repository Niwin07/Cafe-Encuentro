# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Café Encuentro is a full-stack café management system. Staff-facing views (cashier, kitchen, cafeteria bar, waiter) run in the browser with real-time order tracking. Deployed on Vercel as a monorepo where the frontend and backend live side by side.

## Commands

### Backend (from `backend/`)
```bash
npm run dev    # nodemon — hot reload during development
npm start      # plain node — production-like
```

### Frontend (from `frontend/`)
```bash
npm run dev    # Vite dev server (proxies /api → http://localhost:5000)
npm run build  # production build
npm run lint   # ESLint
```

### Full local setup
1. Copy `backend/.env.example` → `backend/.env` and fill in all variables.
2. Run the backend (`npm run dev` in `backend/`).
3. Run the frontend (`npm run dev` in `frontend/`).

## Architecture

### Deployment (Vercel monorepo)
Vercel is configured from `frontend/vercel.json`. The trick that makes this work:
- `frontend/api/index.js` re-exports `backend/index.js`, turning the Express app into a Vercel serverless function at `/api`.
- All `/api/*` requests rewrite to that single function; all other paths serve the Vite SPA.
- In development, `frontend/src/services/api.js` points axios at `http://localhost:5000/api`; in production it uses the relative `/api` path (no CORS needed).

### Backend structure
Each domain lives in `backend/api/<domain>/` with three files: `*.model.js` (SQL with `?` placeholders through the mysql2-style wrapper in `conexion.js`), `*.controller.js` (request/response logic), `*.routes.js` (Express router). All routes are assembled in `backend/api/main.js` and mounted under `/api` in `backend/index.js`.

Domains: `auth`, `productos`, `pedidos`, `categorias`, `destinos`, `acompanamientos`, `registros`.

Key cross-cutting pieces:
- `backend/conexion.js` — PostgreSQL pool (`pg`, SSL, max 3 for serverless) wrapped in a mysql2-compatible API: `pool.query()` returns `[rows]` / `[{insertId, affectedRows}]`, `?` → `$n`, `getConnection()` for transactions, PG error codes mapped to `ER_*`. On first use per instance it runs `backend/sql/schema.js` (idempotent `CREATE TABLE IF NOT EXISTS` + seed of destinos Cocina=1/Cafeteria=2). If `cajeras` is empty, `conexion.js` creates `admin` with the password from `ADMIN_PASSWORD` (no hardcoded password). SSL: set `DB_CA_CERT` to verify Aiven's certificate; `DB_SSL=false` only for a local DB. The session runs in `DB_TIMEZONE` (default Buenos Aires), so naive date strings like `2026-11-15 00:00:00` are Argentina time. Write Postgres SQL (`ILIKE`, `TRUE/FALSE` for `activo`, `FOR UPDATE OF <alias>` with outer joins). `npm run db:init` applies the schema manually.
- `backend/api/middleware/auth.js` — JWT verification; attaches `req.cajera` to authenticated requests. Most routes use `verificarToken`; kitchen/cafeteria item-state changes use no auth. `POST /api/auth/registro` requires a token (cashiers are created from the admin panel).
- `backend/api/utils/db.js` — `conTransaccion(fn)` (BEGIN/COMMIT/ROLLBACK + a single release), `errorNegocio(status, mensaje)` for controlled errors, shared `obtenerIdDestinoPorNombre`. In PostgreSQL an error inside a transaction aborts it: avoid try/catch-and-retry inside `conTransaccion`; use `ON CONFLICT` instead (see order-ID generation in `pedidos.controller.js`).
- The public `PATCH /api/pedidos/items/:itemId/estado` only accepts `ESTADOS_ITEM_COCINA` (`Pendiente`, `En Preparación`, `Listo`) on active items. `Entregado`/`Cancelado` go through the authenticated `/:id/entregar` and `/:id/cancelar`, which also handle stock.
- Order creation validates the **aggregated** demand per product/side dish (including side dishes linked to a product's stock) under `SELECT … FOR UPDATE`.
- Error responses always include `mensaje`; the frontend shows `err.response?.data?.mensaje`.
- Date filters go through `normalizarFecha` (helpers.js): naive `YYYY-MM-DD[ HH:mm:ss]` strings pass through (session time zone), ISO strings with a zone become `Date`, anything else is ignored.
- `backend/api/middleware/validator.js` — global `sanitizar` middleware + `validarCamposRequeridos` / `validarEnum` helpers used in routes.
- `backend/api/utils/constants.js` — canonical state strings (`Pendiente`, `En Preparación`, `Listo`, `Entregado`, `Cancelado`) and domain enums. Always import from here rather than hardcoding strings.

### Database keep-alive
Aiven powers off idle free-tier services. `GET /api/keepalive` (`backend/api/keepalive/`) upserts a row in the `keepalive` table. It is called daily by a Vercel Cron Job (`crons` in `frontend/vercel.json`) and every 6h by `.github/workflows/keepalive.yml` (needs repo variable `KEEPALIVE_URL`). If `CRON_SECRET` is set, the endpoint requires `Authorization: Bearer <CRON_SECRET>`.

### Product images
Admins can **upload their own photo** (`POST /api/productos/:id/imagen`, body `{ imagen: dataURI }`) or generate one with AI. The frontend shrinks the photo in the browser (`frontend/src/lib/imagen.js`, longest side 1280 px, JPEG) because Vercel caps requests at 4.5 MB; `backend/index.js` allows a 4 MB JSON body only on that route (100 KB elsewhere). The backend checks the real format by magic bytes (JPEG/PNG/WebP, max 3 MB) and uploads to the same Cloudinary `public_id` as AI images.

#### AI image generation pipeline
`backend/api/productos/imagenIA.service.js`:
1. Translates the product name/description Spanish → English via MyMemory API.
2. Appends a fixed photography style prompt.
3. Generates the image: Hugging Face Inference API (`stabilityai/stable-diffusion-3-medium-diffusers`, needs `HF_TOKEN` and paid credits once the free monthly quota runs out) and, if that fails or there is no token, **Pollinations** (`gen.pollinations.ai/image/{prompt}`, free; `POLLINATIONS_KEY` from enter.pollinations.ai, optional `POLLINATIONS_MODEL`; without a key it tries anonymous access and the legacy `image.pollinations.ai`). After an HF 402 the instance skips HF. Failures return a 503 with a readable `mensaje`.
4. Uploads the resulting JPEG buffer to Cloudinary (`cafe-encuentro/productos/producto_<id>`) with `overwrite: true, invalidate: true` — requires `CLOUDINARY_URL`. The `invalidate` flag is essential: without it the CDN serves the old image after a regeneration.

### Frontend structure
Single-page app using **wouter** for routing and `AuthContext` for JWT state (stored in `localStorage`). Styled exclusively with **Tailwind CSS** — no per-page CSS files.

Route → component map:
| Path | Component | Auth required |
|------|-----------|---------------|
| `/` | `VistaMozos` | No |
| `/login` | `Login` | No |
| `/cocina` | `VistaCocina` | No |
| `/cafeteria` | `VistaCafeteria` | No |
| `/pedidos` | `MenuCajera` | Yes |
| `/admin` | `AdminPanel` | Yes |
| `/registros` | `Registros` | Yes |

Kitchen (`VistaCocina`) and cafeteria bar (`VistaCafeteria`) poll for active items by destination ID. `VistaMozos` displays active orders across all destinations.

### UI component system (`frontend/src/components/ui/`)
All new UI must use these components instead of raw HTML elements:

- **`Button`** — variants: `primary` | `secondary` | `outline` | `ghost` | `danger` | `success`. Props: `icon`, `iconRight`, `loading`, `fullWidth`, `size` (`sm`/`md`/`lg`). All components use `forwardRef`.
- **`Modal`** — bottom sheet on mobile, centered dialog on desktop. Props: `open`, `onClose`, `title`, `description`, `footer`, `size` (`sm`/`md`/`lg`/`xl`). Escape key and overlay click close it automatically. Mount with `key={item.id}` on the parent to reset internal form state when the target changes.
- **`Input` / `Select` / `Textarea`** — all accept `label`, `error`, and `ref` via `forwardRef`.
- **`Toast` / `useToast()`** — never use `alert()` or `confirm()`. Use `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`. For destructive confirmations: `const ok = await toast.confirm('message', { danger: true })`.
- **`Skeleton` / `SkeletonGrid`** — use during data loading instead of spinners where layout permits.

### Tailwind design tokens
Custom palette defined in `frontend/tailwind.config.js`:
- **`coffee-*`** — primary brand color (dark browns). Use for text, headers, backgrounds.
- **`cream-*`** — warm off-whites. Use for page backgrounds and card fills.
- **`gold-*`** — accent color for badges and highlights.
- **`success` / `warning` / `danger` / `info`** — semantic colors (50/100/500/600/700 shades).
- Custom shadows: `shadow-soft`, `shadow-card`, `shadow-elevated`, `shadow-floating`.
- Custom animations: `animate-fadeIn`, `animate-slideUp`, `animate-slideDown`, `animate-scaleIn`, `animate-sheetUp`, `animate-shimmer`.

## Environment variables

All required vars are in `backend/.env.example`. The three external services are:
- **PostgreSQL (Aiven)** — `DATABASE_URL` (Service URI) or `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`; optional `DB_CA_CERT`, `DB_TIMEZONE`, `ADMIN_PASSWORD` (only used when the DB has no cashiers)
- **Cloudinary** — `CLOUDINARY_URL` (combined) or the three split vars
- **Hugging Face** — `HF_TOKEN` (free "Read" token from huggingface.co; image generation needs credits)
- **Pollinations** — `POLLINATIONS_KEY` (free key from enter.pollinations.ai), fallback image generator

JWT expires in 2 days (`JWT_EXPIRACION = '2d'` in constants).
