import { useState, useEffect } from 'react';
import api from '../../services/api';
import './VistaCocina.css';

const VistaCocina = () => {
  const [pedidos, setPedidos] = useState({});
  const [ultimoUpdate, setUltimoUpdate] = useState(new Date());

  const cargarPedidos = async () => {
    try {
      const res = await api.get('/pedidos/cocina/activos');
      setPedidos(res.data.items || {});
      setUltimoUpdate(new Date());
    } catch (error) {
      console.error('Error conectando con cocina:', error);
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

  // Calcular estadísticas
  const totalPedidos = Object.keys(pedidos).length;
  const totalItems = Object.values(pedidos).reduce((sum, items) => sum + items.length, 0);

  return (
    <div className="cocina-container">
      
      {/* HEADER PREMIUM */}
      <div className="cocina-header">
        <div className="cocina-header-content">
          <div className="cocina-title-section">
            <h1>
              <span className="cocina-emoji">🍳</span>
              Cocina - Pedidos Activos
            </h1>
            <div className="cocina-subtitle">
              <span>🔥</span>
              <span>Sistema de gestión en tiempo real</span>
            </div>
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

      {/* ESTADO VACÍO */}
      {Object.keys(pedidos).length === 0 ? (
        <div className="cocina-vacio">
          <span className="cocina-vacio-icon">🎉</span>
          <h2>¡Todo listo!</h2>
          <p>No hay pedidos pendientes en este momento</p>
        </div>
      ) : (
        
        /* GRID DE PEDIDOS */
        <div className="cocina-grid">
          {Object.entries(pedidos).map(([pedidoId, items]) => (
            <div key={pedidoId} className="cocina-card">
              
              {/* Header del pedido */}
              <div className="cocina-card-header">
                <div className="cocina-header-top">
                  <span className="cocina-pedido-id">
                    #{pedidoId.slice(-6)}
                  </span>
                  
                  <div className="cocina-time-badge">
                    <span className="cocina-time-icon">🕐</span>
                    <span className="cocina-time">
                      {new Date(items[0].created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
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

              {/* Cuerpo del pedido */}
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
                            <span>🥄</span>
                            <span>{item.acompanamiento_nombre}</span>
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

export default VistaCocina;