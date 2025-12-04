/**
 * Constantes de estados de pedidos (items individuales)
 */
const ESTADOS_PEDIDO_ITEM = {
  PENDIENTE: 'Pendiente',
  EN_PREPARACION: 'En Preparación',
  LISTO: 'Listo',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado'
};

/**
 * Array de estados válidos para pedido item (útil para validaciones)
 */
const ESTADOS_ITEM_VALIDOS = Object.values(ESTADOS_PEDIDO_ITEM);

/**
 * Constantes de estados de pedidos (cabecera/general)
 */
const ESTADOS_PEDIDO_GENERAL = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En Proceso',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado'
};

/**
 * Array de estados válidos para pedido general
 */
const ESTADOS_GENERAL_VALIDOS = Object.values(ESTADOS_PEDIDO_GENERAL);

/**
 * Categorías de acompañamientos
 */
const CATEGORIAS_ACOMPANAMIENTO = {
  BEBIDA: 'Bebida',
  EXTRA: 'Extra',
  DULCE: 'Dulce',
  OTRO: 'Otro'
};

/**
 * Tipos de destino
 */
const DESTINOS = {
  COCINA: 'Cocina',
  CAFETERIA: 'Cafeteria'
};

/**
 * Mensajes de error comunes
 */
const MENSAJES_ERROR = {
  STOCK_INSUFICIENTE: 'Stock insuficiente para este producto',
  PRODUCTO_NO_ENCONTRADO: 'Producto no encontrado',
  PEDIDO_NO_ENCONTRADO: 'Pedido no encontrado',
  PEDIDO_ITEM_NO_ENCONTRADO: 'Item del pedido no encontrado',
  CREDENCIALES_INVALIDAS: 'Usuario o contraseña incorrectos',
  USUARIO_INACTIVO: 'Usuario inactivo',
  CATEGORIA_NO_ENCONTRADA: 'Categoría no encontrada',
  DESTINO_NO_ENCONTRADO: 'Destino no encontrado',
  ACOMPANAMIENTO_NO_ENCONTRADO: 'Acompañamiento no encontrado',
  CAJERA_NO_ENCONTRADA: 'Cajera no encontrada'
};

/**
 * Mensajes de éxito comunes
 */
const MENSAJES_EXITO = {
  PEDIDO_CREADO: 'Pedido creado exitosamente',
  PEDIDO_ACTUALIZADO: 'Pedido actualizado exitosamente',
  PEDIDO_CANCELADO: 'Pedido cancelado y stock devuelto',
  PEDIDO_ENTREGADO: 'Pedido marcado como entregado',
  PRODUCTO_CREADO: 'Producto creado exitosamente',
  PRODUCTO_ACTUALIZADO: 'Producto actualizado exitosamente',
  PRODUCTO_ELIMINADO: 'Producto eliminado exitosamente',
  STOCK_ACTUALIZADO: 'Stock actualizado exitosamente',
  LOGIN_EXITOSO: 'Inicio de sesión exitoso'
};

/**
 * Configuración de paginación por defecto
 */
const PAGINACION = {
  LIMITE_DEFAULT: 20,
  LIMITE_MAX: 100
};

/**
 * Tiempo de expiración del token JWT (en formato string para jsonwebtoken)
 */
const JWT_EXPIRACION = '2d'; // 2 días

/**
 * Regex para validaciones
 */
const REGEX = {
  SOLO_NUMEROS: /^\d+$/,
  SOLO_LETRAS: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
  ALFANUMERICO: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  TELEFONO: /^[0-9+\s()-]+$/
};

module.exports = {
  ESTADOS_PEDIDO_ITEM,
  ESTADOS_ITEM_VALIDOS,
  ESTADOS_PEDIDO_GENERAL,
  ESTADOS_GENERAL_VALIDOS,
  CATEGORIAS_ACOMPANAMIENTO,
  DESTINOS,
  MENSAJES_ERROR,
  MENSAJES_EXITO,
  PAGINACION,
  JWT_EXPIRACION,
  REGEX
};