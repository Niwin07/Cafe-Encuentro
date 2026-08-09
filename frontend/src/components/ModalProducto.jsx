import { useState, useEffect } from 'react';
import { X, Minus, Plus, Utensils, StickyNote, ShoppingCart, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import './ModalProducto.css';

const ModalProducto = ({ producto, carrito, onClose, onConfirm }) => {
  const toast = useToast();
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  const [acompanamientoId, setAcompanamientoId] = useState('');

  useEffect(() => {
    setCantidad(1);
    setNota('');
    setAcompanamientoId('');
  }, [producto]);

  useEffect(() => {
    if (!producto) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [producto, onClose]);

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
      toast.error(`Stock insuficiente del producto. Quedan ${stockRealProducto} reales.`);
      return;
    }
    if (stockInsuficienteAcomp) {
        toast.error(`Stock insuficiente de "${acompSeleccionado.nombre}". Quedan ${stockRealAcomp} reales.`);
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
        <div
          className="modal-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-producto-titulo"
        >

          <div className="modal-header">
            <div>
              <h3 id="modal-producto-titulo" className="modal-titulo">{producto.nombre}</h3>
              {producto.descripcion && <p className="modal-descripcion">{producto.descripcion}</p>}
            </div>
            <button onClick={onClose} className="modal-btn-cerrar" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          <div className="modal-body">
            {producto.imagen_url && (
              <img
                src={producto.imagen_url}
                alt={producto.nombre}
                className="modal-imagen"
              />
            )}
            <div className="modal-precio-section">
              <span className="modal-precio-label">Precio unitario</span>
              <span className="modal-precio">${producto.precio}</span>
            </div>

            <div className="modal-section">
              <label className="modal-label">Cantidad</label>
              <div className="cantidad-selector">
                <button onClick={decrementar} disabled={cantidad <= 1} className="btn-cantidad" aria-label="Restar cantidad">
                  <Minus size={18} />
                </button>
                <input type="number" readOnly value={cantidad} className="cantidad-input" aria-label="Cantidad seleccionada"/>
                <button onClick={incrementar} disabled={cantidad >= stockRealProducto} className="btn-cantidad" aria-label="Sumar cantidad">
                  <Plus size={18} />
                </button>
              </div>

              <small className={`modal-stock ${stockRealProducto < 5 ? 'stock-bajo' : ''}`}>
                {stockRealProducto <= 0 ? 'Sin stock' : `Disponibles: ${stockRealProducto}`}
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
                <label className="modal-label">
                  <Utensils size={15} className="modal-label-icon" aria-hidden="true" /> Acompañamiento
                  <span style={{ color: 'var(--error)', marginLeft: '0.25rem' }}>*</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    (Obligatorio)
                  </span>
                </label>
                <select 
                  value={acompanamientoId} 
                  onChange={e => setAcompanamientoId(e.target.value)}
                  className="modal-select"
                  style={{ 
                    borderColor: (!acompanamientoId || stockInsuficienteAcomp) ? 'var(--error)' : 'var(--success)'
                  }}
                >
                  <option value="">-- Selecciona un acompañamiento --</option>
                  
                  {opcionesDisponibles.map(op => {
                      const stockDisp = calcularStockAcomp(op);
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
                
                {/* Mensaje cuando no se ha seleccionado */}
                {!acompanamientoId && (
                  <small className="modal-hint-message modal-hint-error">
                      <AlertTriangle size={13} aria-hidden="true" /> Debes seleccionar un acompañamiento para continuar
                  </small>
                )}

                {/* Mensajes de ayuda o error cuando sí está seleccionado */}
                {acompanamientoId && !stockInsuficienteAcomp && (
                  <small className="modal-hint-message modal-hint-success">
                      <CheckCircle2 size={13} aria-hidden="true" /> Stock suficiente ({stockRealAcomp} disponibles)
                  </small>
                )}

                {stockInsuficienteAcomp && (
                    <small className="modal-hint-message modal-hint-error">
                        <AlertTriangle size={13} aria-hidden="true" /> No hay suficiente stock (Solo quedan {stockRealAcomp})
                    </small>
                )}
              </div>
            )}

            <div className="modal-section">
              <label className="modal-label">
                <StickyNote size={15} className="modal-label-icon" aria-hidden="true" /> Notas especiales
              </label>
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
                disabled={
                  stockInsuficienteProd ||
                  stockInsuficienteAcomp ||
                  (opcionesDisponibles.length > 0 && !acompanamientoId) // Nueva condición
                }
              >
                <ShoppingCart size={16} aria-hidden="true" /> Agregar al Pedido
            </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalProducto;