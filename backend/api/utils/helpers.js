const { ESTADOS_PEDIDO_ITEM, ESTADOS_PEDIDO_GENERAL } = require('./constants');

/**
 * Genera un ID para un pedido. Formato: P + timestamp (ms).
 * Es monotónico dentro de la instancia: dos pedidos en el mismo milisegundo
 * ya no reciben el mismo ID. Entre instancias serverless distintas la
 * colisión se resuelve reintentando el INSERT (ver pedidos.controller crear).
 */
let ultimoTimestampPedido = 0;
const generarIdPedido = () => {
  ultimoTimestampPedido = Math.max(Date.now(), ultimoTimestampPedido + 1);
  return 'P' + ultimoTimestampPedido;
};

/**
 * Calcula el estado general del pedido basado en los estados de sus items
 * @param {Array} items - Array de items del pedido con su estado
 * @returns {string} Estado general del pedido
 */
const calcularEstadoGeneral = (items) => {
  if (!items || items.length === 0) {
    return ESTADOS_PEDIDO_GENERAL.PENDIENTE;
  }

  // Si todos están cancelados
  const todosCancelados = items.every(
    item => item.estado === ESTADOS_PEDIDO_ITEM.CANCELADO
  );
  if (todosCancelados) {
    return ESTADOS_PEDIDO_GENERAL.CANCELADO;
  }

  // Si todos están entregados (o cancelados)
  const todosEntregadosOCancelados = items.every(
    item => item.estado === ESTADOS_PEDIDO_ITEM.ENTREGADO || 
            item.estado === ESTADOS_PEDIDO_ITEM.CANCELADO
  );
  if (todosEntregadosOCancelados) {
    return ESTADOS_PEDIDO_GENERAL.COMPLETADO;
  }

  // Si alguno está en preparación o listo
  const algunoEnProceso = items.some(
    item => item.estado === ESTADOS_PEDIDO_ITEM.EN_PREPARACION || 
            item.estado === ESTADOS_PEDIDO_ITEM.LISTO
  );
  if (algunoEnProceso) {
    return ESTADOS_PEDIDO_GENERAL.EN_PROCESO;
  }

  // Por defecto, pendiente
  return ESTADOS_PEDIDO_GENERAL.PENDIENTE;
};

/**
 * Formatea un precio a formato argentino
 * @param {number} precio - Precio a formatear
 * @returns {string} Precio formateado (ej: $6.500,00)
 */
const formatearPrecio = (precio) => {
  if (!precio && precio !== 0) return '$0,00';
  
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(precio);
};

/**
 * Formatea una fecha a formato legible
 * @param {Date|string} fecha - Fecha a formatear
 * @param {boolean} incluirHora - Si debe incluir la hora
 * @returns {string} Fecha formateada
 */
const formatearFecha = (fecha, incluirHora = true) => {
  if (!fecha) return '';
  
  const date = new Date(fecha);
  
  const opciones = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(incluirHora && {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  };
  
  return new Intl.DateTimeFormat('es-AR', opciones).format(date);
};

/**
 * Valida si un stock es suficiente
 * @param {number} stockActual - Stock disponible
 * @param {number} cantidadSolicitada - Cantidad que se quiere usar
 * @returns {boolean} true si hay stock suficiente
 */
const validarStock = (stockActual, cantidadSolicitada) => {
  return stockActual >= cantidadSolicitada && cantidadSolicitada > 0;
};

/**
 * Calcula el subtotal de un item
 * @param {number} precioUnitario - Precio unitario del producto
 * @param {number} cantidad - Cantidad de productos
 * @returns {number} Subtotal calculado
 */
const calcularSubtotal = (precioUnitario, cantidad) => {
  return Number((precioUnitario * cantidad).toFixed(2));
};

/**
 * Calcula el total de un pedido sumando todos sus items
 * @param {Array} items - Array de items con subtotal
 * @returns {number} Total del pedido
 */
const calcularTotalPedido = (items) => {
  if (!items || items.length === 0) return 0;
  
  const total = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  return Number(total.toFixed(2));
};

/**
 * Sanitiza un string para prevenir inyecciones SQL básicas
 * @param {string} str - String a sanitizar
 * @returns {string} String sanitizado
 */
const sanitizarString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Eliminar < y >
    .replace(/['"]/g, '') // Eliminar comillas
    .substring(0, 500); // Limitar longitud
};

/**
 * Crea un objeto de paginación
 * @param {number} pagina - Número de página actual
 * @param {number} limite - Cantidad de items por página
 * @param {number} total - Total de items
 * @returns {object} Objeto con info de paginación
 */
const crearPaginacion = (pagina, limite, total) => {
  const totalPaginas = Math.ceil(total / limite);
  
  return {
    paginaActual: pagina,
    itemsPorPagina: limite,
    totalItems: total,
    totalPaginas,
    tienePaginaAnterior: pagina > 1,
    tienePaginaSiguiente: pagina < totalPaginas
  };
};

/**
 * Maneja errores de base de datos y los convierte en errores más legibles
 * @param {Error} error - Error de MySQL
 * @returns {object} Objeto con tipo y mensaje de error
 */
const manejarErrorDB = (error) => {
  const errores = {
    ER_DUP_ENTRY: {
      tipo: 'DUPLICADO',
      mensaje: 'Ya existe un registro con esos datos'
    },
    ER_NO_REFERENCED_ROW_2: {
      tipo: 'REFERENCIA_INVALIDA',
      mensaje: 'El registro referenciado no existe'
    },
    ER_ROW_IS_REFERENCED_2: {
      tipo: 'EN_USO',
      mensaje: 'No se puede eliminar porque está siendo utilizado'
    },
    ER_BAD_FIELD_ERROR: {
      tipo: 'CAMPO_INVALIDO',
      mensaje: 'Campo de base de datos inválido'
    }
  };

  return errores[error.code] || {
    tipo: 'ERROR_DB',
    mensaje: 'Error en la base de datos'
  };
};

/**
 * Convierte un objeto plano en formato de query string
 * @param {object} params - Objeto con parámetros
 * @returns {string} Query string
 */
const crearQueryString = (params) => {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
};

/**
 * Agrupa un array de objetos por una propiedad
 * @param {Array} array - Array a agrupar
 * @param {string} propiedad - Propiedad por la cual agrupar
 * @returns {object} Objeto con items agrupados
 */
const agruparPor = (array, propiedad) => {
  return array.reduce((grupos, item) => {
    const valor = item[propiedad];
    if (!grupos[valor]) {
      grupos[valor] = [];
    }
    grupos[valor].push(item);
    return grupos;
  }, {});
};

/**
 * Valida si una fecha es válida
 * @param {string|Date} fecha - Fecha a validar
 * @returns {boolean} true si es válida
 */
const esFechaValida = (fecha) => {
  const date = new Date(fecha);
  return date instanceof Date && !isNaN(date);
};

/**
 * Valida un filtro de fecha recibido por query string.
 * - "YYYY-MM-DD" o "YYYY-MM-DD HH:mm[:ss]" (sin zona): se devuelve tal cual y
 *   PostgreSQL lo interpreta en la zona de la sesión (DB_TIMEZONE, por defecto
 *   America/Argentina/Buenos_Aires; ver conexion.js).
 * - ISO con zona ("…Z" o "…-03:00"): se convierte a Date (instante exacto).
 * Devuelve undefined si no hay valor o es inválido (el filtro se ignora), así
 * un texto arbitrario nunca llega a la consulta.
 */
const normalizarFecha = (valor) => {
  if (!valor || typeof valor !== 'string') return undefined;
  if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(valor)) return valor;
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(valor)) {
    const fecha = new Date(valor);
    return isNaN(fecha) ? undefined : fecha;
  }
  return undefined;
};

module.exports = {
  generarIdPedido,
  calcularEstadoGeneral,
  formatearPrecio,
  formatearFecha,
  validarStock,
  calcularSubtotal,
  calcularTotalPedido,
  sanitizarString,
  crearPaginacion,
  manejarErrorDB,
  crearQueryString,
  agruparPor,
  esFechaValida,
  normalizarFecha
};