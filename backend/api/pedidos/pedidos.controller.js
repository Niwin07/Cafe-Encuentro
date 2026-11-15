const pedidosModel = require('./pedidos.model');
const {
  MENSAJES_ERROR,
  MENSAJES_EXITO,
  ESTADOS_PEDIDO_ITEM,
  ESTADOS_PEDIDO_GENERAL,
  ESTADOS_ITEM_COCINA,
  PAGINACION
} = require('../utils/constants');
const {
  generarIdPedido,
  calcularEstadoGeneral,
  calcularSubtotal,
  agruparPor
} = require('../utils/helpers');
const { conTransaccion, errorNegocio, obtenerIdDestinoPorNombre } = require('../utils/db');

const MAX_ITEMS_POR_PEDIDO = 50;
const MAX_INTENTOS_ID = 5;

const esEnteroPositivo = (valor) => Number.isInteger(valor) && valor > 0;

/**
 * Bloquea (FOR UPDATE) y devuelve un Map id → fila para los IDs dados.
 */
const bloquearPorIds = async (connection, tabla, ids) => {
  const mapa = new Map();
  if (ids.length === 0) return mapa;
  const [rows] = await connection.query(
    `SELECT * FROM ${tabla} WHERE id IN (?) ORDER BY id FOR UPDATE`,
    [ids]
  );
  rows.forEach(row => mapa.set(row.id, row));
  return mapa;
};

/**
 * Devuelve al stock lo consumido por los items no cancelados/entregados de un pedido.
 * Compartido por cancelar y eliminar (antes estaba duplicado).
 */
const devolverStockItems = async (connection, pedidoId, estadosExcluidos) => {
  const [items] = await connection.query(`
    SELECT pi.id, pi.producto_id, pi.cantidad, pi.acompanamiento_id, a.producto_vinculado_id
    FROM pedidos_items pi
    LEFT JOIN acompanamientos a ON pi.acompanamiento_id = a.id
    WHERE pi.pedido_id = ? AND pi.estado NOT IN (?)
    FOR UPDATE OF pi
  `, [pedidoId, estadosExcluidos]);

  for (const item of items) {
    await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [item.cantidad, item.producto_id]);

    if (item.acompanamiento_id) {
      if (item.producto_vinculado_id) {
        await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [item.cantidad, item.producto_vinculado_id]);
      } else {
        await connection.query('UPDATE acompanamientos SET stock = stock + ? WHERE id = ?', [item.cantidad, item.acompanamiento_id]);
      }
    }
  }
  return items;
};

/**
 * Crear un nuevo pedido completo con sus items (transaccional)
 * POST /api/pedidos
 */
const crear = async (req, res, next) => {
  try {
    const { cliente, items, notas } = req.body;
    const cajeraId = req.cajera.id;

    // 1. Validación de entrada (antes de abrir la transacción)
    if (typeof cliente !== 'string' || cliente.trim() === '' || cliente.length > 150) {
      throw errorNegocio(400, 'El nombre del cliente es obligatorio (máx. 150 caracteres)', 'Datos incompletos');
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS_POR_PEDIDO) {
      throw errorNegocio(400, `El pedido debe tener entre 1 y ${MAX_ITEMS_POR_PEDIDO} items`, 'Datos incompletos');
    }

    const itemsNormalizados = items.map((item) => {
      const cantidad = Number(item?.cantidad);
      const prodId = Number(item?.producto_id);
      const acompId = item?.acompanamiento_id ? Number(item.acompanamiento_id) : null;

      if (!esEnteroPositivo(cantidad) || !esEnteroPositivo(prodId) || (acompId !== null && !esEnteroPositivo(acompId))) {
        throw errorNegocio(400, 'Cada item necesita producto_id y una cantidad entera mayor a 0', 'Item inválido');
      }
      const instrucciones = typeof item.instrucciones_especiales === 'string'
        ? item.instrucciones_especiales.slice(0, 500)
        : null;
      return { cantidad, prodId, acompId, instrucciones };
    });

    const pedidoId = await conTransaccion(async (connection) => {
      // 2. Bloquear todas las filas involucradas
      const acompIds = [...new Set(itemsNormalizados.filter(i => i.acompId).map(i => i.acompId))];
      const acomps = await bloquearPorIds(connection, 'acompanamientos', acompIds);

      const prodIds = new Set(itemsNormalizados.map(i => i.prodId));
      acomps.forEach(a => { if (a.producto_vinculado_id) prodIds.add(a.producto_vinculado_id); });
      const productos = await bloquearPorIds(connection, 'productos', [...prodIds]);

      // 3. Validar y acumular la DEMANDA TOTAL por producto/acompañamiento.
      //    Antes se validaba cada línea por separado contra el stock original,
      //    así que "3 + 3" de un producto con stock 5 pasaba y dejaba stock -1.
      const demandaProductos = new Map();
      const demandaAcomps = new Map();
      const sumar = (mapa, id, cantidad) => mapa.set(id, (mapa.get(id) || 0) + cantidad);

      const itemsProcesados = itemsNormalizados.map((item) => {
        const producto = productos.get(item.prodId);
        if (!producto || !producto.activo) {
          throw errorNegocio(400, `El producto "${producto?.nombre || item.prodId}" no está disponible`);
        }
        sumar(demandaProductos, producto.id, item.cantidad);

        if (item.acompId) {
          const acomp = acomps.get(item.acompId);
          if (!acomp || !acomp.activo) {
            throw errorNegocio(400, 'El acompañamiento seleccionado no está disponible');
          }
          if (acomp.producto_vinculado_id) {
            sumar(demandaProductos, acomp.producto_vinculado_id, item.cantidad);
          } else {
            sumar(demandaAcomps, acomp.id, item.cantidad);
          }
        }

        return {
          ...item,
          precio: producto.precio,
          subtotal: calcularSubtotal(producto.precio, item.cantidad),
          destino_id: producto.destino_id
        };
      });

      for (const [id, demanda] of demandaProductos) {
        const producto = productos.get(id);
        if (!producto) throw errorNegocio(400, `El producto vinculado ${id} no existe`);
        if (producto.stock < demanda) {
          throw errorNegocio(400, `Stock insuficiente para "${producto.nombre}". Disponibles: ${producto.stock}, solicitados: ${demanda}`, 'Stock insuficiente');
        }
      }
      for (const [id, demanda] of demandaAcomps) {
        const acomp = acomps.get(id);
        if (acomp.stock < demanda) {
          throw errorNegocio(400, `Stock insuficiente de "${acomp.nombre}". Disponibles: ${acomp.stock}, solicitados: ${demanda}`, 'Stock insuficiente');
        }
      }

      const totalPedido = Number(itemsProcesados.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2));

      // 4. Insertar cabecera. Si el ID colisiona (otra instancia serverless en el
      //    mismo milisegundo) se reintenta con un ID nuevo. Se usa ON CONFLICT
      //    porque en PostgreSQL un error dentro de la transacción la aborta entera.
      let nuevoId;
      for (let intento = 1; ; intento++) {
        nuevoId = generarIdPedido();
        const [insercion] = await connection.query(`
          INSERT INTO pedidos (id, cliente, cajera_id, total, notas, estado_general)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        `, [nuevoId, cliente.trim(), cajeraId, totalPedido, notas || null, ESTADOS_PEDIDO_GENERAL.PENDIENTE]);
        if (insercion.affectedRows === 1) break;
        if (intento >= MAX_INTENTOS_ID) throw errorNegocio(500, 'No se pudo generar un ID de pedido único');
      }

      // 5. Insertar items y descontar stock (una sola vez por fila, con la demanda acumulada)
      for (const item of itemsProcesados) {
        await connection.query(`
          INSERT INTO pedidos_items (
            pedido_id, producto_id, cantidad, precio_unitario, subtotal,
            acompanamiento_id, instrucciones_especiales, estado, destino_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          nuevoId, item.prodId, item.cantidad, item.precio, item.subtotal,
          item.acompId, item.instrucciones, ESTADOS_PEDIDO_ITEM.PENDIENTE, item.destino_id
        ]);
      }
      for (const [id, demanda] of demandaProductos) {
        await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [demanda, id]);
      }
      for (const [id, demanda] of demandaAcomps) {
        await connection.query('UPDATE acompanamientos SET stock = stock - ? WHERE id = ?', [demanda, id]);
      }

      return nuevoId;
    });

    const pedidoCreado = await pedidosModel.obtenerPorId(pedidoId);
    res.status(201).json({ mensaje: MENSAJES_EXITO.PEDIDO_CREADO, pedido: pedidoCreado });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancelar pedido y devolver stock (transaccional)
 * PATCH /api/pedidos/:id/cancelar
 */
const cancelar = async (req, res, next) => {
  try {
    const { id } = req.params;

    await conTransaccion(async (connection) => {
      const [pedidos] = await connection.query('SELECT estado_general FROM pedidos WHERE id = ? FOR UPDATE', [id]);
      if (pedidos.length === 0) throw errorNegocio(404, MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO);

      const estado = pedidos[0].estado_general;
      if (estado === ESTADOS_PEDIDO_GENERAL.CANCELADO || estado === ESTADOS_PEDIDO_GENERAL.COMPLETADO) {
        throw errorNegocio(400, 'El pedido ya fue finalizado o cancelado');
      }

      const items = await devolverStockItems(connection, id, [ESTADOS_PEDIDO_ITEM.ENTREGADO, ESTADOS_PEDIDO_ITEM.CANCELADO]);
      if (items.length > 0) {
        await connection.query('UPDATE pedidos_items SET estado = ? WHERE id IN (?)', [ESTADOS_PEDIDO_ITEM.CANCELADO, items.map(i => i.id)]);
      }
      await connection.query('UPDATE pedidos SET estado_general = ? WHERE id = ?', [ESTADOS_PEDIDO_GENERAL.CANCELADO, id]);
    });

    res.json({ mensaje: MENSAJES_EXITO.PEDIDO_CANCELADO, pedido_id: id });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar pedido definitivamente (transaccional)
 * DELETE /api/pedidos/:id
 */
const eliminar = async (req, res, next) => {
  try {
    const { id } = req.params;

    await conTransaccion(async (connection) => {
      const [pedidos] = await connection.query('SELECT estado_general FROM pedidos WHERE id = ? FOR UPDATE', [id]);
      if (pedidos.length === 0) throw errorNegocio(404, MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO);

      // Si no está cancelado, se devuelve el stock antes de borrar
      if (pedidos[0].estado_general !== ESTADOS_PEDIDO_GENERAL.CANCELADO) {
        await devolverStockItems(connection, id, [ESTADOS_PEDIDO_ITEM.CANCELADO]);
      }

      await connection.query('DELETE FROM pedidos_items WHERE pedido_id = ?', [id]);
      await connection.query('DELETE FROM pedidos WHERE id = ?', [id]);
    });

    res.json({ mensaje: 'Registro eliminado definitivamente y stock ajustado' });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todos los pedidos
 */
const obtenerTodos = async (req, res, next) => {
  try {
    const limite = Math.min(parseInt(req.query.limite) || 50, PAGINACION.LIMITE_HISTORIAL);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const filtros = {
      estado_general: req.query.estado_general,
      cajera_id: req.query.cajera_id,
      fecha_desde: req.query.fecha_desde,
      fecha_hasta: req.query.fecha_hasta,
      cliente: req.query.cliente,
      limite,
      offset
    };

    const pedidos = await pedidosModel.obtenerTodos(filtros);
    const total = await pedidosModel.contarTodos(filtros);

    res.json({ total, limite, offset, pedidos });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener un pedido por ID
 */
const obtenerPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pedido = await pedidosModel.obtenerPorId(id);

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado', mensaje: MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO });
    }
    res.json(pedido);
  } catch (error) {
    next(error);
  }
};

const responderActivosPorDestino = async (res, destinoId) => {
  const items = await pedidosModel.obtenerItemsActivosPorDestino(destinoId);
  const itemsAgrupados = agruparPor(items, 'pedido_id');
  res.json({ total: items.length, pedidos: Object.keys(itemsAgrupados).length, items: itemsAgrupados });
};

/**
 * Obtener items activos de Cocina
 */
const obtenerCocinaActivos = async (req, res, next) => {
  try {
    await responderActivosPorDestino(res, await obtenerIdDestinoPorNombre('Cocina'));
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener items activos de Cafetería
 */
const obtenerCafeteriaActivos = async (req, res, next) => {
  try {
    await responderActivosPorDestino(res, await obtenerIdDestinoPorNombre('Cafeteria'));
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener items activos por destino genérico
 */
const obtenerActivosPorDestino = async (req, res, next) => {
  try {
    await responderActivosPorDestino(res, req.params.destinoId);
  } catch (error) {
    next(error);
  }
};

/**
 * Cambiar estado de un item (vistas de cocina/cafetería)
 * PATCH /api/pedidos/items/:itemId/estado
 *
 * Solo admite Pendiente / En Preparación / Listo y solo sobre items activos.
 * Antes aceptaba "Cancelado"/"Entregado" sin autenticación y sin devolver stock,
 * y permitía "revivir" items de pedidos ya cancelados.
 */
const cambiarEstadoItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { estado } = req.body;

    if (!ESTADOS_ITEM_COCINA.includes(estado)) {
      throw errorNegocio(400, `El estado debe ser uno de: ${ESTADOS_ITEM_COCINA.join(', ')}`, 'Estado inválido');
    }

    const item = await pedidosModel.obtenerItemPorId(itemId);
    if (!item) throw errorNegocio(404, MENSAJES_ERROR.PEDIDO_ITEM_NO_ENCONTRADO, 'Item no encontrado');

    const nuevoEstadoGeneral = await conTransaccion(async (connection) => {
      // Se bloquea la cabecera para que dos cambios simultáneos no calculen
      // el estado general sobre datos viejos.
      const [pedidos] = await connection.query('SELECT estado_general FROM pedidos WHERE id = ? FOR UPDATE', [item.pedido_id]);
      const estadoPedido = pedidos[0]?.estado_general;
      if (estadoPedido === ESTADOS_PEDIDO_GENERAL.CANCELADO || estadoPedido === ESTADOS_PEDIDO_GENERAL.COMPLETADO) {
        throw errorNegocio(400, 'El pedido ya fue entregado o cancelado');
      }

      const [actual] = await connection.query('SELECT estado FROM pedidos_items WHERE id = ? FOR UPDATE', [itemId]);
      if (!ESTADOS_ITEM_COCINA.includes(actual[0]?.estado)) {
        throw errorNegocio(400, 'El item ya fue entregado o cancelado');
      }

      await connection.query('UPDATE pedidos_items SET estado = ? WHERE id = ?', [estado, itemId]);

      const [todos] = await connection.query('SELECT estado FROM pedidos_items WHERE pedido_id = ?', [item.pedido_id]);
      const general = calcularEstadoGeneral(todos);
      await connection.query('UPDATE pedidos SET estado_general = ? WHERE id = ?', [general, item.pedido_id]);
      return general;
    });

    res.json({
      mensaje: 'Estado actualizado exitosamente',
      item: { id: itemId, estado, pedido_id: item.pedido_id, estado_general_pedido: nuevoEstadoGeneral }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marcar pedido completo como entregado (transaccional)
 * PATCH /api/pedidos/:id/entregar
 */
const marcarEntregado = async (req, res, next) => {
  try {
    const { id } = req.params;

    await conTransaccion(async (connection) => {
      const [pedidos] = await connection.query('SELECT estado_general FROM pedidos WHERE id = ? FOR UPDATE', [id]);
      if (pedidos.length === 0) throw errorNegocio(404, MENSAJES_ERROR.PEDIDO_NO_ENCONTRADO, 'Pedido no encontrado');
      if (pedidos[0].estado_general === ESTADOS_PEDIDO_GENERAL.CANCELADO) {
        throw errorNegocio(400, 'No se puede entregar un pedido cancelado');
      }

      await connection.query(
        'UPDATE pedidos_items SET estado = ? WHERE pedido_id = ? AND estado <> ?',
        [ESTADOS_PEDIDO_ITEM.ENTREGADO, id, ESTADOS_PEDIDO_ITEM.CANCELADO]
      );
      await connection.query('UPDATE pedidos SET estado_general = ? WHERE id = ?', [ESTADOS_PEDIDO_GENERAL.COMPLETADO, id]);
    });

    res.json({ mensaje: MENSAJES_EXITO.PEDIDO_ENTREGADO, pedido_id: id });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crear,
  cancelar,
  eliminar,
  obtenerTodos,
  obtenerPorId,
  obtenerCocinaActivos,
  obtenerCafeteriaActivos,
  obtenerActivosPorDestino,
  cambiarEstadoItem,
  marcarEntregado
};
