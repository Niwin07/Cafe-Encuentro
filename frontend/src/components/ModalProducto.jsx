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

  // --- 1. LÓGICA DE STOCK PRODUCTO PRINCIPAL ---
  
  // Cuántos de ESTE producto principal ya tengo en el carrito
  const enCarritoPrincipal = carrito.reduce((acc, item) => {
    return item.id === producto.id ? acc + item.cantidad : acc;
  }, 0);

  // Cuántas veces este producto se usa como ACOMPAÑAMIENTO VINCULADO en el carrito
  const enCarritoComoAcomp = carrito.reduce((acc, item) => {
    return item.acompanamiento_vinculado_id === producto.id ? acc + item.cantidad : acc;
  }, 0);

  const stockRealProducto = producto.stock - enCarritoPrincipal - enCarritoComoAcomp;


  // --- 2. LÓGICA DE STOCK ACOMPAÑAMIENTOS (HELPER) ---
  const opcionesDisponibles = producto.acompanamientos || [];

  // Función reutilizable para calcular el stock real de cualquier opción
  const calcularStockAcomp = (op) => {
      const stockBase = op.stock; // Viene del backend (ya considera si es vinculado o propio)
      
      // Descuento por uso directo de este acompañamiento en carrito
      const usoDirecto = carrito.reduce((acc, item) => {
          // Usamos == para asegurar compatibilidad string/number
          return item.acompanamiento_id == op.id ? acc + item.cantidad : acc;
      }, 0);

      // Descuento por uso de su producto vinculado (si este acomp está vinculado a una Coca, y ya vendí Cocas solas)
      let usoVinculado = 0;
      if (op.producto_vinculado_id) {
          usoVinculado = carrito.reduce((acc, item) => {
              return item.id === op.producto_vinculado_id ? acc + item.cantidad : acc;
          }, 0);
      }

      return stockBase - usoDirecto - usoVinculado;
  };

  // --- 3. VALIDACIONES SELECCIÓN ACTUAL ---
  
  const acompSeleccionado = opcionesDisponibles.find(op => op.id.toString() === acompanamientoId.toString());
  
  // Si hay uno seleccionado, calculamos su stock específico con el helper
  const stockRealAcomp = acompSeleccionado ? calcularStockAcomp(acompSeleccionado) : 0;

  const stockInsuficienteAcomp = acompSeleccionado && stockRealAcomp < cantidad;
  const stockInsuficienteProd = stockRealProducto < cantidad;

  // --- HANDLERS ---

  const handleConfirm = () => {
    if (stockInsuficienteProd) {
      alert(`⚠️ Stock insuficiente del producto. Quedan ${stockRealProducto} reales.`);
      return;
    }
    if (stockInsuficienteAcomp) {
        alert(`⚠️ Stock insuficiente de "${acompSeleccionado.nombre}". Quedan ${stockRealAcomp} reales.`);
        return;
    }

    onConfirm({
      ...producto,
      cantidad,
      instrucciones_especiales: nota,
      acompanamiento_id: acompanamientoId || null,
      acompanamiento_nombre: acompSeleccionado?.nombre,
      // Pasamos los acompanamientos completos para que el padre pueda volver a calcular vínculos si es necesario
      acompanamientos: producto.acompanamientos 
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
              {producto.descripcion && <p className="modal-descripcion">{producto.descripcion}</p>}
            </div>
            <button onClick={onClose} className="modal-btn-cerrar">✕</button>
          </div>

          <div className="modal-body">
            <div className="modal-precio-section">
              <span className="modal-precio-label">Precio unitario</span>
              <span className="modal-precio">${producto.precio}</span>
            </div>

            <div className="modal-section">
              <label className="modal-label">Cantidad</label>
              <div className="cantidad-selector">
                <button onClick={decrementar} disabled={cantidad <= 1} className="btn-cantidad">−</button>
                <input type="number" readOnly value={cantidad} className="cantidad-input"/>
                <button onClick={incrementar} disabled={cantidad >= stockRealProducto} className="btn-cantidad">+</button>
              </div>
              
              <small className={`modal-stock ${stockRealProducto < 5 ? 'stock-bajo' : ''}`}>
                {stockRealProducto <= 0 ? '🚫 Sin Stock' : `✓ Disponibles: ${stockRealProducto}`} 
                { (enCarritoPrincipal + enCarritoComoAcomp) > 0 && 
                  <span style={{marginLeft: '5px', opacity: 0.7}}>
                    (Tienes {enCarritoPrincipal + enCarritoComoAcomp} en carrito)
                  </span> 
                }
              </small>
            </div>

            {/* SECCIÓN ACOMPAÑAMIENTOS MEJORADA */}
            {opcionesDisponibles.length > 0 && (
              <div className="modal-section">
                <label className="modal-label">🥄 Acompañamiento (Opcional)</label>
                <select 
                  value={acompanamientoId} 
                  onChange={e => setAcompanamientoId(e.target.value)}
                  className="modal-select"
                  style={{ borderColor: stockInsuficienteAcomp ? 'var(--error)' : '' }}
                >
                  <option value="">-- Ninguno --</option>
                  
                  {opcionesDisponibles.map(op => {
                      // Calculamos stock para CADA opción aquí mismo
                      const stockDisp = calcularStockAcomp(op);
                      // Deshabilitamos si no alcanza para la cantidad actual
                      const disabled = stockDisp < cantidad;
                      
                      return (
                        <option 
                            key={op.id} 
                            value={op.id} 
                            disabled={disabled}
                            style={{ color: disabled ? '#ccc' : '#000' }}
                        >
                            {op.nombre} {op.categoria ? `(${op.categoria})` : ''} — (Stock: {stockDisp})
                        </option>
                      )
                  })}
                </select>
                
                {/* Mensajes de ayuda o error */}
                {acompanamientoId && !stockInsuficienteAcomp && (
                   <small style={{ color: 'var(--success)', display: 'block', marginTop: '0.25rem' }}>
                      ✓ Stock suficiente ({stockRealAcomp} disponibles)
                   </small>
                )}
                
                {stockInsuficienteAcomp && (
                    <small style={{ color: 'var(--error)', marginTop: '0.25rem', display: 'block', fontWeight: '600' }}>
                        ⚠️ No hay suficiente stock (Solo quedan {stockRealAcomp})
                    </small>
                )}
              </div>
            )}

            <div className="modal-section">
              <label className="modal-label">📝 Notas especiales</label>
              <textarea 
                rows="3" 
                placeholder='Ej: "Sin azúcar", "Tibio", etc.'
                value={nota}
                onChange={e => setNota(e.target.value)}
                className="modal-textarea"
                maxLength={200}
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
                // Deshabilitamos si hay problemas de stock en producto O acompañamiento seleccionado
                disabled={stockInsuficienteProd || stockInsuficienteAcomp}
              >
                ➕ Agregar al Pedido
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalProducto;