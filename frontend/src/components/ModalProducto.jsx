import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // ─── Todos los hooks ANTES del early return (Rules of Hooks) ───────────────

  // Memoizado para que su referencia no invalide los useMemo que dependen de él
  const opcionesDisponibles = useMemo(
    () => producto?.acompanamientos || [],
    [producto]
  );

  // Stock del producto principal descontando el carrito actual
  const enCarritoPrincipal = useMemo(() => {
    if (!producto) return 0;
    return carrito.reduce((acc, item) => item.id === producto.id ? acc + item.cantidad : acc, 0);
  }, [carrito, producto]);

  const enCarritoComoAcomp = useMemo(() => {
    if (!producto) return 0;
    return carrito.reduce((acc, item) => item.acompanamiento_vinculado_id === producto.id ? acc + item.cantidad : acc, 0);
  }, [carrito, producto]);

  const stockRealProducto = (producto?.stock ?? 0) - enCarritoPrincipal - enCarritoComoAcomp;

  // Se recrea solo cuando cambia el carrito, no en cada render del modal
  const calcularStockAcomp = useCallback((op) => {
    const usoDirecto = carrito.reduce((acc, item) => {
      return item.acompanamiento_id == op.id ? acc + item.cantidad : acc;
    }, 0);

    let usoVinculado = 0;
    if (op.producto_vinculado_id) {
      usoVinculado = carrito.reduce((acc, item) => {
        return item.id === op.producto_vinculado_id ? acc + item.cantidad : acc;
      }, 0);
    }

    return op.stock - usoDirecto - usoVinculado;
  }, [carrito]);

  const acompSeleccionado = useMemo(
    () => opcionesDisponibles.find(op => op.id.toString() === acompanamientoId.toString()),
    [opcionesDisponibles, acompanamientoId]
  );

  const stockRealAcomp = useMemo(
    () => acompSeleccionado ? calcularStockAcomp(acompSeleccionado) : 0,
    [acompSeleccionado, calcularStockAcomp]
  );

  const stockInsuficienteAcomp = !!(acompSeleccionado && stockRealAcomp < cantidad);
  const stockInsuficienteProd = stockRealProducto < cantidad;

  const handleConfirm = useCallback(() => {
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
      acompanamientos: producto.acompanamientos
    });

    onClose();
  }, [
    stockInsuficienteProd, stockInsuficienteAcomp, stockRealProducto, stockRealAcomp,
    acompSeleccionado, onConfirm, onClose, producto, cantidad, nota, acompanamientoId
  ]);

  const incrementar = useCallback(() => {
    setCantidad(c => (c < stockRealProducto ? c + 1 : c));
  }, [stockRealProducto]);

  const decrementar = useCallback(() => {
    setCantidad(c => (c > 1 ? c - 1 : c));
  }, []);

  // ─── Early return después de todos los hooks ────────────────────────────────
  if (!producto) return null;

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
                <button onClick={decrementar} disabled={cantidad <= 1} className="btn-cantidad">−</button>
                <input type="number" readOnly value={cantidad} className="cantidad-input"/>
                <button onClick={incrementar} disabled={cantidad >= stockRealProducto} className="btn-cantidad">+</button>
              </div>

              <small className={`modal-stock ${stockRealProducto < 5 ? 'stock-bajo' : ''}`}>
                {stockRealProducto <= 0 ? '🚫 Sin Stock' : `✓ Disponibles: ${stockRealProducto}`}
                {(enCarritoPrincipal + enCarritoComoAcomp) > 0 && (
                  <span style={{marginLeft: '5px', opacity: 0.7}}>
                    (Tienes {enCarritoPrincipal + enCarritoComoAcomp} en carrito)
                  </span>
                )}
              </small>
            </div>

            {opcionesDisponibles.length > 0 && (
              <div className="modal-section">
                <label className="modal-label">
                  🥄 Acompañamiento
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
                    );
                  })}
                </select>

                {!acompanamientoId && (
                  <small style={{ color: 'var(--error)', display: 'block', marginTop: '0.5rem', fontWeight: '600' }}>
                    ⚠️ Debes seleccionar un acompañamiento para continuar
                  </small>
                )}

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
                disabled={
                  stockInsuficienteProd ||
                  stockInsuficienteAcomp ||
                  (opcionesDisponibles.length > 0 && !acompanamientoId)
                }
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
