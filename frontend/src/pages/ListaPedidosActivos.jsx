import { useState, useEffect } from 'react';
import api from '../services/api';

const ListaPedidosActivos = () => {
  const [pedidos, setPedidos] = useState({});

  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarPedidos = async () => {
    try {
      const resCocina = await api.get('/pedidos/cocina/activos');
      const resCafe = await api.get('/pedidos/cafeteria/activos');
      const todosItems = { ...resCocina.data.items, ...resCafe.data.items };
      setPedidos(todosItems);
    } catch (error) {
      console.error(error);
    }
  };

  const entregarPedido = async (pedidoId) => {
    if (!window.confirm('¿Entregar pedido al cliente?')) return;
    try {
      await api.patch(`/pedidos/${pedidoId}/entregar`);
      cargarPedidos();
    } catch (error) { alert(error.message); }
  };

  const cancelarPedido = async (pedidoId) => {
    if (!window.confirm('⚠️ ¿Estás segura de CANCELAR este pedido? Se devolverá el stock.')) return;
    try {
      await api.patch(`/pedidos/${pedidoId}/cancelar`);
      alert('Pedido cancelado correctamente');
      cargarPedidos();
    } catch (error) { alert(error.message); }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '15px', background: '#f4e9d8', borderBottom: '1px solid #e8d4b8' }}>
        <h3 style={{ margin: 0, fontSize: '1.2em' }}>📦 Pedidos Activos</h3>
      </div>
      
      <div style={{ padding: '15px', overflowY: 'auto', flex: 1 }}>
        {Object.keys(pedidos).length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999' }}>No hay pedidos pendientes</p>
        ) : (
          Object.entries(pedidos).map(([id, items]) => {
            const listosParaEntregar = items.every(i => i.estado === 'Listo' || i.estado === 'Cancelado');
            const cliente = items[0]?.cliente || 'Cliente';
            
            return (
              <div key={id} style={{ 
                marginBottom: '15px', padding: '12px', borderRadius: '10px',
                border: listosParaEntregar ? '2px solid #2e7d32' : '1px solid #e8d4b8',
                background: listosParaEntregar ? '#f0fdf4' : 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '1.1em' }}>{cliente}</strong>
                  <span style={{ fontSize: '0.85em', color: '#888' }}>#{id.slice(-4)}</span>
                </div>

                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                  {items.map((item, idx) => (
                    <div key={idx} title={`${item.producto_nombre}: ${item.estado}`} style={{
                      flex: 1, height: '6px', borderRadius: '3px',
                      backgroundColor: item.estado === 'Listo' ? '#2e7d32' : item.estado === 'En Preparación' ? '#0288d1' : '#f57c00'
                    }} />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {listosParaEntregar ? (
                    <button onClick={() => entregarPedido(id)} className="btn btn-success" style={{ flex: 1 }}>
                      ✅ ENTREGAR
                    </button>
                  ) : (
                    <div style={{ flex: 1, textAlign: 'center', color: '#f57c00', fontSize: '0.9em', padding: '5px' }}>
                      ⏳ En proceso...
                    </div>
                  )}
                  
                  <button onClick={() => cancelarPedido(id)} className="btn btn-danger" style={{ padding: '8px 12px' }}>
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