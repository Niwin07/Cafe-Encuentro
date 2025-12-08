import { useState, useEffect } from 'react';
import './ModalProducto.css';

const ModalProducto = ({ producto, onClose, onConfirm }) => {
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  const [acompanamientoId, setAcompanamientoId] = useState('');

  // Reset al cambiar de producto
  useEffect(() => {
    setCantidad(1);
    setNota('');
    setAcompanamientoId('');
  }, [producto]);

  if (!producto) return null;

  const opcionesDisponibles = producto.acompanamientos || [];

  // Buscar objeto completo del acompañamiento seleccionado
  const acompSeleccionado = opcionesDisponibles.find(op => op.id.toString() === acompanamientoId.toString());

  // Validación de Stock Combinada
  const stockInsuficienteAcomp = acompSeleccionado && acompSeleccionado.stock < cantidad;

  const handleConfirm = () => {
    if (cantidad > producto.stock) {
      alert(`⚠️ Stock insuficiente del producto principal. Solo hay ${producto.stock}.`);
      return;
    }

    if (stockInsuficienteAcomp) {
        alert(`⚠️ Stock insuficiente de "${acompSeleccionado.nombre}". Solo hay ${acompSeleccionado.stock} unidades.`);
        return;
    }

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
    if (cantidad < producto.stock) {
      setCantidad(cantidad + 1);
    }
  };

  const decrementar = () => {
    if (cantidad > 1) {
      setCantidad(cantidad - 1);
    }
  };

  const subtotal = (producto.precio * cantidad).toFixed(2);

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
                <input 
                  type="number" 
                  readOnly 
                  value={cantidad} 
                  className="cantidad-input"
                />
                <button onClick={incrementar} disabled={cantidad >= producto.stock} className="btn-cantidad">+</button>
              </div>
              <small className={`modal-stock ${producto.stock < 5 ? 'stock-bajo' : ''}`}>
                {producto.stock < 5 ? '⚠️' : '✓'} Stock producto: <strong>{producto.stock}</strong>
              </small>
            </div>

            {/* SECCIÓN ACOMPAÑAMIENTOS MEJORADA */}
            {opcionesDisponibles.length > 0 && (
              <div className="modal-section">
                <label className="modal-label">
                  🥄 Acompañamiento (Opcional)
                </label>
                <select 
                  value={acompanamientoId} 
                  onChange={e => setAcompanamientoId(e.target.value)}
                  className="modal-select"
                  style={{ 
                    borderColor: stockInsuficienteAcomp ? 'var(--error)' : 'var(--border-light)' 
                  }}
                >
                  <option value="">-- Ninguno --</option>
                  {opcionesDisponibles.map(op => {
                    const disabled = op.stock < cantidad; // Deshabilitar si no alcanza para la cantidad actual
                    return (
                        <option key={op.id} value={op.id} disabled={op.stock <= 0}>
                        {op.nombre} {op.categoria ? `(${op.categoria})` : ''} - [Stock: {op.stock}] {disabled && '(Insuficiente)'}
                        </option>
                    )
                  })}
                </select>
                
                {/* Mensaje de error de stock de acompañamiento */}
                {stockInsuficienteAcomp && (
                    <small style={{ color: 'var(--error)', marginTop: '0.25rem', display: 'block', fontWeight: '600' }}>
                        ⚠️ Solo quedan {acompSeleccionado.stock} unidades de este acompañamiento.
                    </small>
                )}
                <small className="modal-hint">
                    Nota: Se descontará 1 unidad de acompañamiento por cada unidad de producto principal ({cantidad}).
                </small>
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
              <span className="modal-subtotal-precio">${subtotal}</span>
            </div>
            <div className="modal-actions">
              <button onClick={onClose} className="btn btn-secondary modal-btn-cancelar">Cancelar</button>
              <button 
                onClick={handleConfirm} 
                className="btn btn-primary modal-btn-agregar"
                disabled={cantidad > producto.stock || stockInsuficienteAcomp} // Bloquea botón
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