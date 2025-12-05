import { useState, useEffect } from 'react';
import api from '../services/api';

const ListaPedidosActivos = () => {
  const [pedidos, setPedidos] = useState({});
  // ESTADO NUEVO: Para saber qué tarjeta está desplegada
  const [expandedId, setExpandedId] = useState(null); 

  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarPedidos = async () => {
    try {
      const resCocina = await api.get('/pedidos/cocina/activos');
      const resCafe = await api.get('/pedidos/cafeteria/activos');

      const itemsCocina = resCocina.data.items || {};
      const itemsCafe = resCafe.data.items || {};

      // 1. Creamos un objeto nuevo para combinar sin perder datos
      const combinados = { ...itemsCocina };

      // 2. Recorremos los pedidos de Cafetería y los sumamos
      Object.keys(itemsCafe).forEach((pedidoId) => {
        if (combinados[pedidoId]) {
          // Si el pedido YA EXISTE en cocina, CONCATENAMOS (sumamos) los items
          combinados[pedidoId] = [...combinados[pedidoId], ...itemsCafe[pedidoId]];
        } else {
          // Si no existe, lo agregamos tal cual
          combinados[pedidoId] = itemsCafe[pedidoId];
        }
      });

      setPedidos(combinados);
    } catch (error) {
      console.error("Error cargando pedidos:", error);
    }
  };

  const entregarPedido = async (e, pedidoId) => {
    e.stopPropagation(); // Evita que se cierre el detalle al hacer click
    if (!window.confirm('¿Entregar pedido al cliente?')) return;
    try {
      await api.patch(`/pedidos/${pedidoId}/entregar`);
      cargarPedidos();
    } catch (error) { alert(error.message); }
  };

  const cancelarPedido = async (e, pedidoId) => {
    e.stopPropagation(); // Evita que se cierre el detalle al hacer click
    if (!window.confirm('⚠️ ¿Estás segura de CANCELAR este pedido? Se devolverá el stock.')) return;
    try {
      await api.patch(`/pedidos/${pedidoId}/cancelar`);
      alert('Pedido cancelado correctamente');
      cargarPedidos();
    } catch (error) { alert(error.message); }
  };

  // Función para abrir/cerrar acordeón
  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '15px', background: '#f4e9d8', borderBottom: '1px solid #e8d4b8' }}>
        <h3 style={{ margin: 0, fontSize: '1.2em' }}>📦 Pedidos Activos</h3>
        <small style={{ color: '#8b5a3c' }}>Toca una tarjeta para ver el detalle</small>
      </div>
      
      <div style={{ padding: '15px', overflowY: 'auto', flex: 1 }}>
        {Object.keys(pedidos).length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999' }}>No hay pedidos pendientes</p>
        ) : (
          Object.entries(pedidos).map(([id, items]) => {
            const listosParaEntregar = items.every(i => i.estado === 'Listo' || i.estado === 'Cancelado');
            const cliente = items[0]?.cliente || 'Cliente';
            const isExpanded = expandedId === id; // ¿Esta tarjeta está abierta?
            
            return (
              <div 
                key={id} 
                onClick={() => toggleExpand(id)} // Al hacer click en la tarjeta, se expande
                style={{ 
                  marginBottom: '15px', padding: '12px', borderRadius: '10px',
                  border: listosParaEntregar ? '2px solid #2e7d32' : '1px solid #e8d4b8',
                  background: listosParaEntregar ? '#f0fdf4' : 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  cursor: 'pointer', // Manito para indicar click
                  transition: 'all 0.2s'
                }}
              >
                {/* CABECERA DE LA TARJETA */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '1.1em', display: 'block' }}>
                       {cliente} {isExpanded ? '🔽' : '▶️'}
                    </strong>
                    <span style={{ fontSize: '0.75em', color: '#8b5a3c' }}>
                      Atendido por: {items[0]?.cajera_nombre}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85em', color: '#888' }}>#{id.slice(-4)}</span>
                </div>

                {/* BARRAS DE ESTADO (RESUMEN) */}
                {!isExpanded && (
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                    {items.map((item, idx) => (
                        <div key={idx} style={{
                        flex: 1, height: '6px', borderRadius: '3px',
                        backgroundColor: item.estado === 'Listo' ? '#2e7d32' : item.estado === 'En Preparación' ? '#0288d1' : '#f57c00'
                        }} />
                    ))}
                    </div>
                )}

                {/* DETALLE EXPANDIDO (LISTA DE COMIDA) */}
                {isExpanded && (
                  <div style={{ 
                      marginTop: '10px', marginBottom: '15px', 
                      padding: '10px', background: '#fff', 
                      borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc' 
                  }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {items.map((item, idx) => (
                        <li key={idx} style={{ padding: '4px 0', borderBottom: '1px solid #eee', fontSize: '0.9em' }}>
                           <div style={{display:'flex', justifyContent:'space-between'}}>
                              <span>
                                 <strong>{item.cantidad || 1}x</strong> {item.producto_nombre}
                                 {item.acompanamiento_nombre && <small style={{color:'#666'}}> (+{item.acompanamiento_nombre})</small>}
                              </span>
                              {/* Badge de estado individual */}
                              <span style={{
                                  fontSize:'0.75em', padding:'2px 6px', borderRadius:'4px',
                                  background: item.estado === 'Listo' ? '#d4edda' : '#fff3cd',
                                  color: item.estado === 'Listo' ? 'green' : '#856404'
                              }}>
                                  {item.estado}
                              </span>
                           </div>
                           {item.instrucciones_especiales && (
                             <div style={{ color: '#d32f2f', fontSize: '0.85em', fontStyle: 'italic', paddingLeft:'15px' }}>
                               Nota: {item.instrucciones_especiales}
                             </div>
                           )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* BOTONES DE ACCIÓN */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  {listosParaEntregar ? (
                    <button onClick={(e) => entregarPedido(e, id)} className="btn btn-success" style={{ flex: 1 }}>
                      ✅ ENTREGAR
                    </button>
                  ) : (
                    <div style={{ flex: 1, textAlign: 'center', color: '#f57c00', fontSize: '0.9em', padding: '5px' }}>
                      ⏳ En proceso...
                    </div>
                  )}
                  
                  <button onClick={(e) => cancelarPedido(e, id)} className="btn btn-danger" style={{ padding: '8px 12px' }}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ListaPedidosActivos;