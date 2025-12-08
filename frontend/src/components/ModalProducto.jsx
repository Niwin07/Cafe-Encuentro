import { useState, useEffect } from 'react';
import './ModalProducto.css';

const ModalProducto = ({ producto, carrito, onClose, onConfirm }) => {
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  const [acompanamientoId, setAcompanamientoId] = useState('');

  useEffect(() => {
    setCantidad(1);
    setNota('');
    setAcompanamientoId('');
  }, [producto]);

  if (!producto) return null;

  // --- LÓGICA DE STOCK INTELIGENTE ---
  
  // 1. Calcular cuántos de ESTE producto principal ya tengo en el carrito
  const enCarritoPrincipal = carrito.reduce((acc, item) => {
    return item.id === producto.id ? acc + item.cantidad : acc;
  }, 0);

  // 2. Calcular cuántas veces este producto se usa como ACOMPAÑAMIENTO VINCULADO en el carrito
  // (Ej: Tengo 2 Cocas en stock. Agregué un Pancho con Coca. Ahora quiero agregar una Coca sola).
  const enCarritoComoAcomp = carrito.reduce((acc, item) => {
    // Si el item del carrito tiene un acompañamiento que está vinculado a ESTE producto
    return item.acompanamiento_vinculado_id === producto.id ? acc + item.cantidad : acc;
  }, 0);

  // Stock Real Disponible del Producto Principal
  const stockRealProducto = producto.stock - enCarritoPrincipal - enCarritoComoAcomp;

  // --- FIN LÓGICA PRODUCTO PRINCIPAL ---

  const opcionesDisponibles = producto.acompanamientos || [];
  const acompSeleccionado = opcionesDisponibles.find(op => op.id.toString() === acompanamientoId.toString());

  // --- LÓGICA DE STOCK ACOMPAÑAMIENTO ---
  let stockRealAcomp = 0;
  if (acompSeleccionado) {
      // Stock base (del acomp o de su vinculado)
      const stockBase = acompSeleccionado.stock; // Ya viene resuelto del backend (el controller de productos hace el COALESCE)
      
      // Ver cuánto se usa este ACOMPAÑAMIENTO específico en el carrito
      const usoDirectoEnCarrito = carrito.reduce((acc, item) => {
          return item.acompanamiento_id == acompSeleccionado.id ? acc + item.cantidad : acc;
      }, 0);

      // Ver cuánto se usa el PRODUCTO VINCULADO a este acompañamiento como plato principal
      // (Ej: Elijo "Coca Acomp". Está vinculada a "Coca Prod". Tengo que ver si hay "Coca Prod" en el carrito principal)
      let usoVinculadoEnCarrito = 0;
      if (acompSeleccionado.producto_vinculado_id) {
          usoVinculadoEnCarrito = carrito.reduce((acc, item) => {
              return item.id === acompSeleccionado.producto_vinculado_id ? acc + item.cantidad : acc;
          }, 0);
      }

      stockRealAcomp = stockBase - usoDirectoEnCarrito - usoVinculadoEnCarrito;
  }

  // Validaciones
  const stockInsuficienteAcomp = acompSeleccionado && stockRealAcomp < cantidad;
  const stockInsuficienteProd = stockRealProducto < cantidad;

  const handleConfirm = () => {
    if (stockInsuficienteProd) {
      alert(`⚠️ Stock insuficiente. Quedan ${stockRealProducto} reales (tienes items en el carrito ocupando stock).`);
      return;
    }
    if (stockInsuficienteAcomp) {
        alert(`⚠️ Stock insuficiente del acompañamiento. Quedan ${stockRealAcomp} reales.`);
        return;
    }
    // ... pasar también los acompañamientos para que el MenuCajera pueda volver a calcular
    onConfirm({
      ...producto,
      cantidad,
      instrucciones_especiales: nota,
      acompanamiento_id: acompanamientoId || null,
      acompanamiento_nombre: acompSeleccionado?.nombre
    });
    onClose();
  };

  const incrementar = () => {
    if (cantidad < stockRealProducto) setCantidad(cantidad + 1);
  };

  const decrementar = () => {
    if (cantidad > 1) setCantidad(cantidad - 1);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-container animate-fade-in">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h3 className="modal-titulo">{producto.nombre}</h3>
            </div>
            <button onClick={onClose} className="modal-btn-cerrar">✕</button>
          </div>

          <div className="modal-body">
            {/* ... precio ... */}
            
            <div className="modal-section">
              <label className="modal-label">Cantidad</label>
              <div className="cantidad-selector">
                <button onClick={decrementar} disabled={cantidad <= 1} className="btn-cantidad">−</button>
                <input type="number" readOnly value={cantidad} className="cantidad-input"/>
                <button onClick={incrementar} disabled={cantidad >= stockRealProducto} className="btn-cantidad">+</button>
              </div>
              
              <small className={`modal-stock ${stockRealProducto < 5 ? 'stock-bajo' : ''}`}>
                {/* Mostramos el Stock Real calculado */}
                {stockRealProducto <= 0 ? '🚫 Sin Stock' : `✓ Disponibles: ${stockRealProducto}`} 
                { (enCarritoPrincipal + enCarritoComoAcomp) > 0 && 
                  <span style={{marginLeft: '5px', opacity: 0.7}}>
                    (Tienes {enCarritoPrincipal + enCarritoComoAcomp} en carrito)
                  </span> 
                }
              </small>
            </div>

            {/* ACOMPAÑAMIENTOS */}
            {opcionesDisponibles.length > 0 && (
              <div className="modal-section">
                <label className="modal-label">🥄 Acompañamiento</label>
                <select 
                  value={acompanamientoId} 
                  onChange={e => setAcompanamientoId(e.target.value)}
                  className="modal-select"
                  style={{ borderColor: stockInsuficienteAcomp ? 'var(--error)' : '' }}
                >
                  <option value="">-- Ninguno --</option>
                  {opcionesDisponibles.map(op => {
                      // Calcular stock de esta opción para deshabilitar en el select
                      // (Repetimos logica brevemente o usamos una funcion auxiliar, 
                      // aquí simplifico visualmente: si el stock base es 0 ya viene disabled del back,
                      // pero lo ideal es validar al confirmar)
                      return (
                        <option key={op.id} value={op.id}>
                            {op.nombre}
                        </option>
                      )
                  })}
                </select>
                
                {acompanamientoId && (
                   <small style={{ color: stockInsuficienteAcomp ? 'var(--error)' : 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                      Stock disponible: {stockRealAcomp}
                   </small>
                )}
              </div>
            )}
            
            {/* ... notas ... */}
             <div className="modal-section">
              <label className="modal-label">📝 Notas especiales</label>
              <textarea 
                rows="3" 
                value={nota}
                onChange={e => setNota(e.target.value)}
                className="modal-textarea"
              />
            </div>
          </div>

          <div className="modal-footer">
            <div className="modal-subtotal">
              <span>Subtotal:</span>
              <span className="modal-subtotal-precio">${(producto.precio * cantidad).toFixed(2)}</span>
            </div>
            <div className="modal-actions">
              <button onClick={onClose} className="btn btn-secondary modal-btn-cancelar">Cancelar</button>
              <button 
                onClick={handleConfirm} 
                className="btn btn-primary modal-btn-agregar"
                disabled={stockInsuficienteProd || stockInsuficienteAcomp}
              >
                ➕ Agregar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalProducto;