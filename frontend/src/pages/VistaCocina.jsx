import { useState, useEffect } from 'react';
import api from '../services/api';

const VistaCocina = () => {
  const [pedidos, setPedidos] = useState({});
  const [ultimoUpdate, setUltimoUpdate] = useState(new Date());

  // Función para cargar pedidos
  const cargarPedidos = async () => {
    try {
      const res = await api.get('/pedidos/cocina/activos');
      setPedidos(res.data.items || {});
      setUltimoUpdate(new Date());
    } catch (error) {
      console.error('Error conectando con cocina:', error);
    }
  };

  // Cargar al inicio y configurar auto-refresh cada 10 segundos
  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 10000);
    return () => clearInterval(intervalo);
  }, []);

  // Función para cambiar estado (De Pendiente -> En Preparación -> Listo -> Entregado)
  const avanzarEstado = async (itemId, estadoActual) => {
    // Eliminamos 'Entregado' para que la cocina pare en 'Listo'
    const flujo = ['Pendiente', 'En Preparación', 'Listo'];
    const idx = flujo.indexOf(estadoActual);
    
    if (idx < flujo.length - 1) {
      const nuevoEstado = flujo[idx + 1];
      try {
        await api.patch(`/pedidos/items/${itemId}/estado`, { estado: nuevoEstado });
        cargarPedidos(); // Recargar para ver el cambio
      } catch (error) {
        alert('Error actualizando estado');
      }
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>🍳 Cocina - Pedidos Activos</h1>
        <span style={{ color: '#888', fontSize: '0.9em' }}>
          Actualizado: {ultimoUpdate.toLocaleTimeString()}
        </span>
      </header>

      {Object.keys(pedidos).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
          <h2>No hay pedidos pendientes 🎉</h2>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {Object.entries(pedidos).map(([pedidoId, items]) => (
            <div key={pedidoId} style={{ 
              backgroundColor: '#1e1e1e', 
              border: '1px solid #444', 
              borderRadius: '8px', 
              overflow: 'hidden' 
            }}>
              {/* Encabezado del Ticket */}
              <div style={{ backgroundColor: '#333', padding: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>#{pedidoId.slice(-6)}</span>
                <span style={{ color: '#ffd700' }}>{items[0].cliente}</span>
                <span style={{ fontSize: '0.8em', color: '#aaa' }}>
                  {new Date(items[0].created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>

              {/* Lista de Items */}
              <div style={{ padding: '10px' }}>
                {items.map(item => (
                  <div key={item.id} style={{ 
                    marginBottom: '10px', 
                    paddingBottom: '10px', 
                    borderBottom: '1px solid #333',
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '1.1em' }}>
                        <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{item.cantidad}x </span>
                        {item.producto_nombre}
                      </div>
                      {item.instrucciones_especiales && (
                        <div style={{ color: 'orange', fontSize: '0.85em', fontStyle: 'italic' }}>
                          ⚠️ {item.instrucciones_especiales}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => avanzarEstado(item.id, item.estado)}
                      style={{ 
                        padding: '5px 10px', 
                        fontSize: '0.8em',
                        backgroundColor: getColorEstado(item.estado),
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {item.estado} ➡️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Ayuda visual para los botones
const getColorEstado = (estado) => {
  switch(estado) {
    case 'Pendiente': return '#ff4444'; // Rojo
    case 'En Preparación': return '#ffbb33'; // Naranja
    case 'Listo': return '#00C851'; // Verde
    default: return '#33b5e5';
  }
};

export default VistaCocina;