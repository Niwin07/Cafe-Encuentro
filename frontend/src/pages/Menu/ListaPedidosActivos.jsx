import { useState, useEffect } from 'react';
import api from '../../services/api';
import './ListaPedidosActivos.css';

const ListaPedidosActivos = () => {
  const [pedidos, setPedidos] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

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

      // Combinar pedidos de cocina y cafetería
      const combinados = { ...itemsCocina };

      Object.keys(itemsCafe).forEach((pedidoId) => {
        if (combinados[pedidoId]) {
          combinados[pedidoId] = [...combinados[pedidoId], ...itemsCafe[pedidoId]];
        } else {
          combinados[pedidoId] = itemsCafe[pedidoId];
        }
      });

      setPedidos(combinados);
      setLoading(false);
    } catch (error) {
      console.error("Error cargando pedidos:", error);
      setLoading(false);
    }
  };

  const entregarPedido = async (e, pedidoId) => {
    e.stopPropagation();
    if (!window.confirm('¿Entregar pedido al cliente?')) return;
    try {
      await api.patch(`/pedidos/${pedidoId}/entregar`);
      cargarPedidos();
    } catch (error) { 
      alert(error.message); 
    }
  };

  const cancelarPedido = async (e, pedidoId) => {
    e.stopPropagation();
    if (!window.confirm('⚠️ ¿Estás segura de CANCELAR este pedido? Se devolverá el stock.')) return;
    try {
      await api.patch(`/pedidos/${pedidoId}/cancelar`);
      alert('Pedido cancelado correctamente');
      cargarPedidos();
    } catch (error) { 
      alert(error.message); 
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const totalPedidos = Object.keys(pedidos).length;

  return (
    <div className="pedidos-activos-container">
      
      {/* Header */}
      <div className="pedidos-header">
        <div className="pedidos-header-titulo">
          <h3>📦 Pedidos Activos</h3>
          <span className="pedidos-contador">{totalPedidos}</span>
        </div>
        <small className="pedidos-instruccion">
          Toca una tarjeta para ver el detalle
        </small>
      </div>
      
      {/* Contenido */}
      <div className="pedidos-content">
        {loading ? (
          <div className="pedidos-loading">
            <svg className="animate-spin" style={{ width: '40px', height: '40px' }} viewBox="0 0 24 24">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Cargando pedidos...</p>
          </div>
        ) : totalPedidos === 0 ? (
          <div className="pedidos-vacio">
            <span className="pedidos-vacio-icono">✨</span>
            <p>No hay pedidos pendientes</p>
            <small>Cuando haya nuevos pedidos aparecerán aquí</small>
          </div>
        ) : (
          Object.entries(pedidos).map(([id, items]) => {
            const listosParaEntregar = items.every(i => i.estado === 'Listo' || i.estado === 'Cancelado');
            const cliente = items[0]?.cliente || 'Cliente';
            const cajera = items[0]?.cajera_nombre || 'Cajera';
            const isExpanded = expandedId === id;
            
            // Contar estados
            const estados = {
              pendiente: items.filter(i => i.estado === 'Pendiente').length,
              enPrep: items.filter(i => i.estado === 'En Preparación').length,
              listo: items.filter(i => i.estado === 'Listo').length
            };
            
            // Calcular total del pedido CON VALIDACIÓN
            const totalPedido = items.reduce((sum, item) => {
              const precio = parseFloat(item.precio) || 0;
              const cantidad = parseInt(item.cantidad) || 0;
              return sum + (precio * cantidad);
            }, 0);
            
            return (
              <div 
                key={id} 
                className={`pedido-card ${listosParaEntregar ? 'pedido-listo' : ''} ${isExpanded ? 'pedido-expanded' : ''}`}
                onClick={() => toggleExpand(id)}
              >
                {/* Header del pedido */}
                <div className="pedido-card-header">
                  <div className="pedido-info">
                    <div className="pedido-cliente">
                      <span className="pedido-icono-expand">
                        {isExpanded ? '🔽' : '▶️'}
                      </span>
                      <strong>{cliente}</strong>
                    </div>
                    <div className="pedido-cajera">
                      👤 {cajera}
                    </div>
                  </div>
                  <div className="pedido-badge-container">
                    <div className="pedido-badge">
                      #{id.slice(-4)}
                    </div>
                    <div className="pedido-total">
                      ${totalPedido.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Barra de progreso resumida */}
                {!isExpanded && (
                  <div className="pedido-progress">
                    {items.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`progress-bar ${item.estado === 'Listo' ? 'bar-listo' : item.estado === 'En Preparación' ? 'bar-prep' : 'bar-pendiente'}`}
                        title={item.producto_nombre}
                      />
                    ))}
                  </div>
                )}

                {/* Detalle expandido */}
                {isExpanded && (
                  <div className="pedido-detalle animate-fade-in">
                    <div className="pedido-items">
                      {items.map((item, idx) => {
                        const precioItem = parseFloat(item.precio) || 0;
                        const cantidadItem = parseInt(item.cantidad) || 0;
                        const subtotalItem = precioItem * cantidadItem;
                        
                        return (
                          <div key={idx} className="pedido-item">
                            <div className="item-info">
                              <div className="item-nombre">
                                <strong>{item.cantidad}×</strong> {item.producto_nombre}
                              </div>
                              {item.acompanamiento_nombre && (
                                <div className="item-acomp">
                                  + {item.acompanamiento_nombre}
                                </div>
                              )}
                              {item.instrucciones_especiales && (
                                <div className="item-nota">
                                  📝 {item.instrucciones_especiales}
                                </div>
                              )}
                            </div>
                            <div className="item-info" style={{ textAlign: 'right', minWidth: 'fit-content' }}>
                              <div className={`item-estado estado-${item.estado.toLowerCase().replace(' ', '-')}`}>
                                {item.estado === 'Listo' ? '✅' : item.estado === 'En Preparación' ? '🔥' : '⏳'}
                              </div>
                              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                ${subtotalItem.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Resumen de estados */}
                    <div className="pedido-resumen">
                      {estados.pendiente > 0 && (
                        <span className="badge badge-warning">
                          ⏳ {estados.pendiente} pendiente{estados.pendiente > 1 ? 's' : ''}
                        </span>
                      )}
                      {estados.enPrep > 0 && (
                        <span className="badge badge-info">
                          🔥 {estados.enPrep} en preparación
                        </span>
                      )}
                      {estados.listo > 0 && (
                        <span className="badge badge-success">
                          ✅ {estados.listo} listo{estados.listo > 1 ? 's' : ''}
                        </span>
                      )}
                      
                      {/* Total visible en el detalle expandido también */}
                      <span className="badge" style={{ 
                        marginLeft: 'auto', 
                        background: 'var(--success)', 
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: '700',
                        padding: '0.5rem 0.75rem'
                      }}>
                        Total: ${totalPedido.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="pedido-actions">
                  {listosParaEntregar ? (
                    <button 
                      onClick={(e) => entregarPedido(e, id)} 
                      className="btn btn-success pedido-btn-entregar"
                    >
                      ✅ ENTREGAR
                    </button>
                  ) : (
                    <div className="pedido-en-proceso">
                      ⏳ En proceso...
                    </div>
                  )}
                  
                  <button 
                    onClick={(e) => cancelarPedido(e, id)} 
                    className="btn btn-danger pedido-btn-cancelar"
                    title="Cancelar pedido"
                  >
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