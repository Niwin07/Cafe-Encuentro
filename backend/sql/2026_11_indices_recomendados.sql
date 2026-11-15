-- Índices recomendados por la auditoría técnica (2026-11).
--
-- El esquema de producción NO está versionado en el repositorio, así que
-- antes de ejecutar verificá qué índices ya existen:
--
--   SHOW INDEX FROM pedidos;
--   SHOW INDEX FROM pedidos_items;
--
-- Ejecutá solo los que falten (MySQL no soporta CREATE INDEX IF NOT EXISTS).
-- InnoDB ya crea índices para las FOREIGN KEY, así que pedidos_items(pedido_id)
-- probablemente exista.

-- Vistas de cocina/cafetería (polling cada 5 s por cada pantalla abierta):
--   WHERE pi.destino_id = ? AND pi.estado IN ('Pendiente','En Preparación','Listo')
CREATE INDEX idx_items_destino_estado ON pedidos_items (destino_id, estado);

-- Historial / registros / cierre de caja:
--   WHERE p.fecha_hora >= ? AND p.fecha_hora <= ?  ORDER BY p.fecha_hora DESC
CREATE INDEX idx_pedidos_fecha_hora ON pedidos (fecha_hora);

-- Filtros por estado dentro de un rango de fechas (resúmenes)
CREATE INDEX idx_pedidos_estado_fecha ON pedidos (estado_general, fecha_hora);
