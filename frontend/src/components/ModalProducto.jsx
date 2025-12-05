import { useState, useEffect } from 'react';

const ModalProducto = ({ producto, onClose, onConfirm }) => {
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  const [acompanamientoId, setAcompanamientoId] = useState('');

  if (!producto) return null;

  // Filtrar acompañamientos por categoría del producto (Opcional: aquí mostramos todos los asignados)
  // El backend (/api/productos/menu) ya nos devuelve los acompañamientos específicos de este producto.
  const opcionesDisponibles = producto.acompanamientos || [];

  const handleConfirm = () => {
    // Buscar nombre del acompañamiento para mostrarlo en el carrito
    const nombreAcomp = opcionesDisponibles.find(a => a.id == acompanamientoId)?.nombre;
    
    onConfirm({
      ...producto,
      cantidad,
      instrucciones_especiales: nota,
      acompanamiento_id: acompanamientoId || null,
      acompanamiento_nombre: nombreAcomp // Para visualización
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: '25px', borderRadius: '16px',
        width: '90%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ marginTop: 0, borderBottom: '2px solid #e8d4b8', paddingBottom: '10px' }}>
          {producto.nombre}
        </h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Cantidad</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="number" min="1" max={producto.stock} 
              value={cantidad} 
              onChange={e => setCantidad(parseInt(e.target.value) || 1)}
              style={{ textAlign: 'center', fontSize: '1.2em' }}
            />
          </div>
          <small style={{ color: producto.stock < 5 ? 'red' : 'gray' }}>
            Stock disponible: {producto.stock}
          </small>
        </div>

        {/* SELECTOR DE ACOMPAÑAMIENTOS */}
        {opcionesDisponibles.length > 0 && (
          <div style={{ marginBottom: '15px', background: '#fdf8f6', padding: '10px', borderRadius: '8px', border: '1px dashed #e8d4b8' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#8b5a3c' }}>
              🥄 Acompañamiento / Opción:
            </label>
            <select 
              value={acompanamientoId} 
              onChange={e => setAcompanamientoId(e.target.value)}
            >
              <option value="">-- Seleccionar opción --</option>
              {opcionesDisponibles.map(op => (
                <option key={op.id} value={op.id}>{op.nombre}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>📝 Notas / Instrucciones:</label>
          <textarea 
            rows="3" 
            placeholder='Ej: "Sin azúcar", "Extra caliente"...'
            value={nota}
            onChange={e => setNota(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn" style={{ background: '#ddd', color: '#333' }}>Cancelar</button>
          <button onClick={handleConfirm} className="btn btn-primary">Agregar al Pedido</button>
        </div>
      </div>
    </div>
  );
};

export default ModalProducto;