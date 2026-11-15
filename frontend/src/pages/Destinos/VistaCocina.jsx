import api, { mensajeError } from '../../services/api';
import usePedidosDestino from '../../hooks/usePedidosDestino';
import './VistaCocina.css';

// Cocina usa un flujo corto. Antes un item 'En Preparación' volvía a 'Pendiente'
// (indexOf devolvía -1 y se tomaba flujo[0]).
const SIGUIENTE_ESTADO = {
  'Pendiente': 'Listo',
  'En Preparación': 'Listo',
};

const VistaCocina = () => {
  const { pedidos, ultimoUpdate, permisoSonido, activarSonido, recargar } =
    usePedidosDestino('/pedidos/cocina/activos');

  // Cambiar estado del item
  const avanzarEstado = async (itemId, estadoActual) => {
    const nuevoEstado = SIGUIENTE_ESTADO[estadoActual];
    if (!nuevoEstado) return;
    try {
      await api.patch(`/pedidos/items/${itemId}/estado`, { estado: nuevoEstado });
    } catch (error) {
      // p. ej. la caja canceló el pedido mientras se preparaba
      alert('⚠️ ' + mensajeError(error, 'Error actualizando estado'));
    } finally {
      recargar();
    }
  };

  // Helpers de UI
  const getEstadoClass = (estado) => {
    switch(estado) {
      case 'Pendiente': return 'estado-pendiente';
      case 'En Preparación': return 'estado-en-preparacion';
      case 'Listo': return 'estado-listo';
      default: return '';
    }
  };

  const getEstadoIcon = (estado) => {
    switch(estado) {
      case 'Pendiente': return '⏳';
      case 'En Preparación': return '🔥';
      case 'Listo': return '✅';
      default: return '➡️';
    }
  };

  const totalPedidos = Object.keys(pedidos).length;
  const totalItems = Object.values(pedidos).reduce((sum, items) => sum + items.length, 0);

  return (
    <div className="cocina-container">
      
      {!permisoSonido && (
        <button className="btn-sound-floating" onClick={activarSonido}>
          <span style={{ fontSize: '1.2rem' }}>🔔</span>
          Activar Avisos
        </button>
      )}
      
      {/* HEADER */}
      <div className="cocina-header">
        <div className="cocina-header-content">
          <div className="cocina-title-section">
            <h1><span className="cocina-emoji">🍳</span> Cocina</h1>
            <div className="cocina-subtitle">🔥 Gestión en tiempo real</div>
          </div>
          
          <div className="cocina-stats">
            <div className="cocina-stat-item">
              <div className="cocina-stat-value">{totalPedidos}</div>
              <div className="cocina-stat-label">Pedidos</div>
            </div>
            <div className="cocina-stat-item">
              <div className="cocina-stat-value">{totalItems}</div>
              <div className="cocina-stat-label">Platos</div>
            </div>
            <div className="cocina-live-indicator">
              <div className="cocina-pulse-dot"></div>
              <div className="cocina-update-time">
                {ultimoUpdate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO CON BARRA */}
      {Object.keys(pedidos).length === 0 ? (
        <div className="cocina-vacio">
          <span className="cocina-vacio-icon">🎉</span>
          <h2>¡Todo listo!</h2>
          <p>No hay pedidos pendientes en este momento</p>
        </div>
      ) : (
        <div className="cocina-orders-section">
          <div className="cocina-grid">
            {Object.entries(pedidos).map(([pedidoId, items]) => (
              <div key={pedidoId} className="cocina-card">
                
                <div className="cocina-card-header">
                  <div className="cocina-header-top">
                    <span className="cocina-pedido-id">#{pedidoId.slice(-6)}</span>
                    <div className="cocina-time-badge">
                      <span className="cocina-time-icon">🕐</span>
                      <span className="cocina-time">{new Date(items[0].created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  <div className="cocina-header-bottom">
                    <div className="cocina-cliente">
                      <span className="cocina-cliente-icon">👤</span>
                      <span>{items[0].cliente}</span>
                    </div>
                    <div className="cocina-cajera-badge">
                      <span>💼</span>
                      <span>{items[0].cajera_nombre}</span>
                    </div>
                  </div>
                </div>

                <div className="cocina-card-body">
                  {items.map(item => (
                    <div key={item.id} className="cocina-item">
                      <div className="cocina-item-header">
                        <div className="cocina-item-info">
                          <div className="cocina-item-nombre">
                            <span className="cocina-cantidad">{item.cantidad}</span>
                            <span>{item.producto_nombre}</span>
                          </div>
                          {item.acompanamiento_nombre && (
                            <div className="cocina-item-acomp">
                              <span>🥄</span> {item.acompanamiento_nombre}
                            </div>
                          )}
                          {item.instrucciones_especiales && (
                            <div className="cocina-item-nota">
                              ⚠️ {item.instrucciones_especiales}
                            </div>
                          )}
                        </div>
                        
                        <button 
                          onClick={() => avanzarEstado(item.id, item.estado)}
                          disabled={item.estado === 'Listo'}
                          className={`cocina-estado-btn ${getEstadoClass(item.estado)}`}
                        >
                          <span>{getEstadoIcon(item.estado)}</span>
                          <span>{item.estado}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaCocina;