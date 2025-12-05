import { useState, useEffect } from 'react';
import api from '../../services/api';
import './VistaCafeteria.css';

const VistaCafeteria = () => {
  const [pedidos, setPedidos] = useState({});
  const [ultimoUpdate, setUltimoUpdate] = useState(new Date());

  const cargarPedidos = async () => {
    try {
      const res = await api.get('/pedidos/cafeteria/activos');
      setPedidos(res.data.items || {});
      setUltimoUpdate(new Date());
    } catch (error) {
      console.error('Error conectando con cafetería:', error);
    }
  };

  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 10000);
    return () => clearInterval(intervalo);
  }, []);

  const avanzarEstado = async (itemId, estadoActual) => {
    const flujo = ['Pendiente', 'En Preparación', 'Listo'];
    const idx = flujo.indexOf(estadoActual);
    
    if (idx < flujo.length - 1) {
      const nuevoEstado = flujo[idx + 1];
      try {
        await api.patch(`/pedidos/items/${itemId}/estado`, { estado: nuevoEstado });
        cargarPedidos();
      } catch (error) {
        alert('Error actualizando estado');
      }
    }
  };

  const getEstadoClass = (estado) => {
    switch(estado) {
      case 'Pendiente': return 'cafe-estado-pendiente';
      case 'En Preparación': return 'cafe-estado-en-preparacion';
      case 'Listo': return 'cafe-estado-listo';
      default: return '';
    }
  };

  const getEstadoIcon = (estado) => {
    switch(estado) {
      case 'Pendiente': return '⏳';
      case 'En Preparación': return '☕';
      case 'Listo': return '✨';
      default: return '➡️';
    }
  };

  // Calcular estadísticas
  const totalPedidos = Object.keys(pedidos).length;
  const totalBebidas = Object.values(pedidos).reduce((sum, items) => sum + items.length, 0);

  return (
    <div className="cafeteria-container">
      
      {/* HEADER PREMIUM */}
      <div className="cafeteria-header">
        <div className="cafeteria-header-content">
          <div className="cafeteria-title-section">
            <h1>
              <span className="cafeteria-emoji">☕</span>
              Cafetería - Pedidos Activos
            </h1>
            <div className="cafeteria-subtitle">
              <span>✨</span>
              <span>Preparando las mejores bebidas</span>
            </div>
          </div>
          
          <div className="cafeteria-stats">
            <div className="cafeteria-stat-item">
              <div className="cafeteria-stat-value">{totalPedidos}</div>
              <div className="cafeteria-stat-label">Pedidos</div>
            </div>
            
            <div className="cafeteria-stat-item">
              <div className="cafeteria-stat-value">{totalBebidas}</div>
              <div className="cafeteria-stat-label">Bebidas</div>
            </div>
            
            <div className="cafeteria-live-indicator">
              <div className="cafeteria-pulse-dot"></div>
              <div className="cafeteria-update-time">
                {ultimoUpdate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ESTADO VACÍO */}
      {Object.keys(pedidos).length === 0 ? (
        <div className="cafeteria-vacio">
          <span className="cafeteria-vacio-icon">☕</span>
          <h2>¡Momento de descanso!</h2>
          <p>No hay pedidos pendientes en este momento</p>
        </div>
      ) : (
        
        /* GRID DE PEDIDOS */
        <div className="cafeteria-grid">
          {Object.entries(pedidos).map(([pedidoId, items]) => (
            <div key={pedidoId} className="cafeteria-card">
              
              {/* Header del pedido */}
              <div className="cafeteria-card-header">
                <div className="cafeteria-header-top">
                  <span className="cafeteria-pedido-id">
                    #{pedidoId.slice(-6)}
                  </span>
                  
                  <div className="cafeteria-time-badge">
                    <span className="cafeteria-time-icon">🕐</span>
                    <span className="cafeteria-time">
                      {new Date(items[0].created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
                
                <div className="cafeteria-header-bottom">
                  <div className="cafeteria-cliente">
                    <span className="cafeteria-cliente-icon">👤</span>
                    <span>{items[0].cliente}</span>
                  </div>
                  
                  <div className="cafeteria-cajera-badge">
                    <span>💼</span>
                    <span>{items[0].cajera_nombre}</span>
                  </div>
                </div>
              </div>

              {/* Cuerpo del pedido */}
              <div className="cafeteria-card-body">
                {items.map(item => (
                  <div key={item.id} className="cafeteria-item">
                    <div className="cafeteria-item-header">
                      <div className="cafeteria-item-info">
                        <div className="cafeteria-item-nombre">
                          <span className="cafeteria-cantidad">{item.cantidad}</span>
                          <span>{item.producto_nombre}</span>
                        </div>
                        
                        {item.acompanamiento_nombre && (
                          <div className="cafeteria-item-acomp">
                            <span>🥄</span>
                            <span>{item.acompanamiento_nombre}</span>
                          </div>
                        )}
                        
                        {item.instrucciones_especiales && (
                          <div className="cafeteria-item-nota">
                            ⚠️ {item.instrucciones_especiales}
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => avanzarEstado(item.id, item.estado)}
                        disabled={item.estado === 'Listo'}
                        className={`cafeteria-estado-btn ${getEstadoClass(item.estado)}`}
                      >
                        <span>{getEstadoIcon(item.estado)}</span>
                        <span>{item.estado}</span>
                        {item.estado !== 'Listo' && <span>→</span>}
                      </button>
                    </div>
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

export default VistaCafeteria;