// Esquema PostgreSQL de Café Encuentro (idempotente).
// Se ejecuta automáticamente al primer uso de la base (ver conexion.js)
// o manualmente con: npm run db:init
module.exports = String.raw`-- =============================================================================
-- Café Encuentro — Esquema PostgreSQL
-- Idempotente: se puede ejecutar varias veces sin romper nada.
-- El backend lo ejecuta automáticamente al primer uso (ver conexion.js).
-- =============================================================================

-- Evita que dos instancias serverless creen el esquema a la vez
SELECT pg_advisory_xact_lock(724501);

-- Función genérica para mantener updated_at (equivalente a ON UPDATE CURRENT_TIMESTAMP de MySQL)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Cajeras (usuarios del sistema)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cajeras (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  usuario       VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Categorías de productos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Destinos (Cocina, Cafetería)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS destinos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Productos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(150)   NOT NULL,
  descripcion  TEXT,
  ingredientes TEXT,
  precio       NUMERIC(10,2)  NOT NULL DEFAULT 0,
  stock        INTEGER        NOT NULL DEFAULT 0,
  stock_minimo INTEGER        NOT NULL DEFAULT 5,
  imagen_url   VARCHAR(500),
  categoria_id INTEGER        NOT NULL REFERENCES categorias(id),
  destino_id   INTEGER        NOT NULL REFERENCES destinos(id),
  activo       BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_destino   ON productos(destino_id);

-- -----------------------------------------------------------------------------
-- Acompañamientos (pueden tener stock propio o estar vinculados a un producto)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS acompanamientos (
  id                    SERIAL PRIMARY KEY,
  nombre                VARCHAR(100) NOT NULL,
  categoria             VARCHAR(50)  NOT NULL DEFAULT 'Otro',
  stock                 INTEGER      NOT NULL DEFAULT 0,
  producto_vinculado_id INTEGER      REFERENCES productos(id) ON DELETE SET NULL,
  activo                BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Relación N a N producto ↔ acompañamiento
CREATE TABLE IF NOT EXISTS productos_acompanamientos (
  producto_id       INTEGER NOT NULL REFERENCES productos(id)       ON DELETE CASCADE,
  acompanamiento_id INTEGER NOT NULL REFERENCES acompanamientos(id) ON DELETE CASCADE,
  PRIMARY KEY (producto_id, acompanamiento_id)
);

-- -----------------------------------------------------------------------------
-- Pedidos (cabecera). El id lo genera la app: 'P' + timestamp
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
  id             VARCHAR(30)   PRIMARY KEY,
  cliente        VARCHAR(150)  NOT NULL,
  cajera_id      INTEGER       NOT NULL REFERENCES cajeras(id),
  fecha_hora     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  estado_general VARCHAR(30)   NOT NULL DEFAULT 'Pendiente',
  total          NUMERIC(10,2) NOT NULL DEFAULT 0,
  notas          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha  ON pedidos(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_pedidos_cajera ON pedidos(cajera_id);

-- -----------------------------------------------------------------------------
-- Items de pedidos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos_items (
  id                       SERIAL PRIMARY KEY,
  pedido_id                VARCHAR(30)   NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id              INTEGER       NOT NULL REFERENCES productos(id),
  cantidad                 INTEGER       NOT NULL DEFAULT 1,
  precio_unitario          NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal                 NUMERIC(10,2) NOT NULL DEFAULT 0,
  acompanamiento_id        INTEGER       REFERENCES acompanamientos(id) ON DELETE SET NULL,
  instrucciones_especiales TEXT,
  estado                   VARCHAR(30)   NOT NULL DEFAULT 'Pendiente',
  destino_id               INTEGER       NOT NULL REFERENCES destinos(id),
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_items_pedido  ON pedidos_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_items_destino ON pedidos_items(destino_id, estado);

-- -----------------------------------------------------------------------------
-- Keep-alive: una sola fila que el cron actualiza para que Aiven vea actividad
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS keepalive (
  id          INTEGER PRIMARY KEY,
  ultimo_ping TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  origen      VARCHAR(100),
  total_pings BIGINT NOT NULL DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- Triggers updated_at
-- -----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['cajeras','categorias','destinos','productos','acompanamientos','pedidos','pedidos_items']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_' || t || '_updated_at') THEN
      EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
                     'trg_' || t || '_updated_at', t);
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Datos iniciales (solo si las tablas están vacías)
-- -----------------------------------------------------------------------------

-- Destinos: la app asume Cocina = 1 y Cafetería = 2 como fallback
INSERT INTO destinos (id, nombre, descripcion, activo)
SELECT * FROM (VALUES
  (1, 'Cocina',    'Platos y comidas', TRUE),
  (2, 'Cafeteria', 'Barra de cafetería y bebidas', TRUE)
) AS v(id, nombre, descripcion, activo)
WHERE NOT EXISTS (SELECT 1 FROM destinos);
SELECT setval(pg_get_serial_sequence('destinos', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM destinos), 1));

-- El usuario admin inicial ya no se crea acá con una contraseña fija:
-- lo crea conexion.js desde la variable ADMIN_PASSWORD si la tabla está vacía.
`;
