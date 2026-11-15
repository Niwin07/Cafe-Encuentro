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
- `backend/conexion.js` — PostgreSQL pool (`pg`, SSL, max 3 for serverless) wrapped in a mysql2-compatible API: `pool.query()` returns `[rows]` / `[{insertId, affectedRows}]`, `?` → `$n`, `getConnection()` for transactions, PG error codes mapped to `ER_*`. On first use per instance it runs `backend/sql/schema.js` (idempotent `CREATE TABLE IF NOT EXISTS` + seed of destinos Cocina=1/Cafeteria=2 and an `admin` user when tables are empty). Write Postgres SQL (`ILIKE`, `TRUE/FALSE` for `activo`, `FOR UPDATE OF <alias>` with outer joins). `npm run db:init` applies the schema manually.
- `backend/api/middleware/auth.js` — JWT verification; attaches `req.cajera` to authenticated requests. Most routes use `verificarToken`; kitchen/cafeteria views use `verificarTokenOpcional` or no auth.
- `backend/api/middleware/validator.js` — global `sanitizar` middleware applied to all requests.
- `backend/api/utils/constants.js` — canonical state strings (`Pendiente`, `En Preparación`, `Listo`, `Entregado`, `Cancelado`) and domain enums used by both models and controllers.

### Database keep-alive
Aiven powers off idle free-tier services. `GET /api/keepalive` (`backend/api/keepalive/`) upserts a row in the `keepalive` table. It is called daily by a Vercel Cron Job (`crons` in `frontend/vercel.json`) and every 6h by `.github/workflows/keepalive.yml` (needs repo variable `KEEPALIVE_URL`). If `CRON_SECRET` is set, the endpoint requires `Authorization: Bearer <CRON_SECRET>`.

### AI image generation pipeline
`backend/api/productos/imagenIA.service.js`:
1. Translates the product name/description Spanish → English via MyMemory API.
2. Appends a fixed photography style prompt.
3. Calls Hugging Face Inference API (`stabilityai/stable-diffusion-3-medium-diffusers`) — requires `HF_TOKEN`.
4. Uploads the resulting JPEG buffer to Cloudinary (`cafe-encuentro/productos/producto_<id>`) — requires `CLOUDINARY_URL`.

### Frontend structure
Single-page app using **wouter** for routing and `AuthContext` for JWT state (stored in `localStorage`). Tailwind CSS + custom `.css` files per page.

Route → component map:
| Path | Component | Auth required |
|------|-----------|---------------|
| `/` | `VistaMozos` | No |
| `/pedidos` | `MenuCajera` | Yes (redirects to `/login`) |
| `/cocina` | `VistaCocina` | No |
| `/cafeteria` | `VistaCafeteria` | No |
| `/admin` | `AdminPanel` | Yes |
| `/registros` | `Registros` | No |

Kitchen (`VistaCocina`) and cafeteria bar (`VistaCafeteria`) poll for active items by destination ID. `VistaMozos` displays active orders across all destinations.

## Environment variables

All required vars are in `backend/.env.example`. The three external services are:
- **PostgreSQL (Aiven)** — `DATABASE_URL` (Service URI) or `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- **Cloudinary** — `CLOUDINARY_URL` (combined) or the three split vars
- **Hugging Face** — `HF_TOKEN` (free "Read" token from huggingface.co)

JWT expires in 2 days (`JWT_EXPIRACION = '2d'` in constants).
