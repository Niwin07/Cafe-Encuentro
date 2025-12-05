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

  const handleConfirm = () => {
    if (cantidad > producto.stock) {
      alert(`⚠️ Stock insuficiente. Solo hay ${producto.stock} disponibles.`);
      return;
    }

    const nombreAcomp = opcionesDisponibles.find(a => a.id == acompanamientoId)?.nombre;
    
    onConfirm({
      ...producto,
      cantidad,
      instrucciones_especiales: nota,
      acompanamiento_id: acompanamientoId || null,
      acompanamiento_nombre: nombreAcomp
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
      {/* Overlay */}
      <div className="modal-overlay" onClick={onClose} />
      
      {/* Modal */}
      <div className="modal-container animate-fade-in">
        <div className="modal-content">
          
          {/* Header */}
          <div className="modal-header">
            <div>
              <h3 className="modal-titulo">{producto.nombre}</h3>
              {producto.descripcion && (
                <p className="modal-descripcion">{producto.descripcion}</p>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="modal-btn-cerrar"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            
            {/* Precio */}
            <div className="modal-precio-section">
              <span className="modal-precio-label">Precio unitario</span>
              <span className="modal-precio">${producto.precio}</span>
            </div>

            {/* Cantidad */}
            <div className="modal-section">
              <label className="modal-label">Cantidad</label>
              <div className="cantidad-selector">
                <button 
                  onClick={decrementar}
                  disabled={cantidad <= 1}
                  className="btn-cantidad"
                  aria-label="Disminuir"
                >
                  −
                </button>
                <input 
                  type="number" 
                  min="1" 
                  max={producto.stock}
                  value={cantidad} 
                  onChange={e => {
                    const val = parseInt(e.target.value) || 1;
                    if (val >= 1 && val <= producto.stock) {
                      setCantidad(val);
                    }
                  }}
                  className="cantidad-input"
                />
                <button 
                  onClick={incrementar}
                  disabled={cantidad >= producto.stock}
                  className="btn-cantidad"
                  aria-label="Aumentar"
                >
                  +
                </button>
              </div>
              <small className={`modal-stock ${producto.stock < 5 ? 'stock-bajo' : ''}`}>
                {producto.stock < 5 ? '⚠️' : '✓'} Stock disponible: <strong>{producto.stock}</strong>
              </small>
            </div>

            {/* Acompañamientos */}
            {opcionesDisponibles.length > 0 && (
              <div className="modal-section">
                <label className="modal-label">
                  🥄 Acompañamiento / Opción
                </label>
                <select 
                  value={acompanamientoId} 
                  onChange={e => setAcompanamientoId(e.target.value)}
                  className="modal-select"
                >
                  <option value="">-- Sin acompañamiento --</option>
                  {opcionesDisponibles.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.nombre} {op.categoria && `(${op.categoria})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notas */}
            <div className="modal-section">
              <label className="modal-label">
                📝 Instrucciones especiales (opcional)
              </label>
              <textarea 
                rows="3" 
                placeholder='Ej: "Sin azúcar", "Extra caliente", "Poco hielo"...'
                value={nota}
                onChange={e => setNota(e.target.value)}
                className="modal-textarea"
                maxLength={200}
              />
              <small className="modal-hint">
                {nota.length}/200 caracteres
              </small>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <div className="modal-subtotal">
              <span>Subtotal:</span>
              <span className="modal-subtotal-precio">${subtotal}</span>
            </div>
            <div className="modal-actions">
              <button 
                onClick={onClose} 
                className="btn btn-secondary modal-btn-cancelar"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirm} 
                className="btn btn-primary modal-btn-agregar"
                disabled={cantidad > producto.stock}
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