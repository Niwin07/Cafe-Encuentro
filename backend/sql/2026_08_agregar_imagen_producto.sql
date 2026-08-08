-- Agrega el campo para guardar la URL de la imagen (generada por IA o subida manualmente) de cada producto.
-- Ejecutar una sola vez contra la base de datos de producción/desarrollo.

ALTER TABLE productos
  ADD COLUMN imagen_url VARCHAR(500) NULL AFTER stock_minimo;
