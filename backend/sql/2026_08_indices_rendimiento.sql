-- Índices para las consultas más frecuentes del sistema (polling de cocina/
-- cafetería cada 5s, listados de pedidos por fecha/estado). Ejecutar una
-- sola vez contra la base de datos de producción/desarrollo.
--
-- Nota: no se puede verificar contra la base de datos real desde este
-- entorno (sin credenciales de conexión); si alguno de estos índices ya
-- existe con otro nombre, MySQL devolverá "Duplicate key name" — en ese
-- caso simplemente comentar/quitar esa línea puntual antes de ejecutar.

-- Listados y filtros por fecha (Registros, historial de pedidos)
CREATE INDEX idx_pedidos_fecha_hora ON pedidos (fecha_hora);

-- Filtro por estado general (resúmenes, cierre de caja)
CREATE INDEX idx_pedidos_estado_general ON pedidos (estado_general);

-- Query más caliente de la app: "activos" de cocina/cafetería, filtrando
-- pedidos_items por destino + estado cada vez que la pantalla hace polling.
CREATE INDEX idx_pedidos_items_destino_estado ON pedidos_items (destino_id, estado);
