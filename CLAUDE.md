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
Each domain lives in `backend/api/<domain>/` with three files: `*.model.js` (SQL via `mysql2/promise`), `*.controller.js` (request/response logic), `*.routes.js` (Express router). All routes are assembled in `backend/api/main.js` and mounted under `/api` in `backend/index.js`.

Domains: `auth`, `productos`, `pedidos`, `categorias`, `destinos`, `acompanamientos`, `registros`.

Key cross-cutting pieces:
- `backend/conexion.js` — shared MySQL connection pool (SSL enabled, limit 3 for serverless compatibility).
- `backend/api/middleware/auth.js` — JWT verification; attaches `req.cajera` to authenticated requests. Most routes use `verificarToken`; kitchen/cafeteria item-state changes use no auth.
- `backend/api/middleware/validator.js` — global `sanitizar` middleware + `validarCamposRequeridos` / `validarEnum` helpers used in routes.
- `backend/api/utils/constants.js` — canonical state strings (`Pendiente`, `En Preparación`, `Listo`, `Entregado`, `Cancelado`) and domain enums. Always import from here rather than hardcoding strings.

### AI image generation pipeline
`backend/api/productos/imagenIA.service.js`:
1. Translates the product name/description Spanish → English via MyMemory API.
2. Appends a fixed photography style prompt.
3. Calls Hugging Face Inference API (`stabilityai/stable-diffusion-3-medium-diffusers`) — requires `HF_TOKEN`.
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
- **MySQL** — `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- **Cloudinary** — `CLOUDINARY_URL` (combined) or the three split vars
- **Hugging Face** — `HF_TOKEN` (free "Read" token from huggingface.co)

JWT expires in 2 days (`JWT_EXPIRACION = '2d'` in constants).
