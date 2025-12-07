import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import './VistaCocina.css';

// Animación para el botón flotante (CSS en JS)
const styleSheet = document.styleSheets[0];
try {
    styleSheet.insertRule(`
      @keyframes pulse-button {
        0%, 100% { transform: scale(1); box-shadow: 0 8px 25px rgba(255, 61, 0, 0.5); }
        50% { transform: scale(1.05); box-shadow: 0 12px 35px rgba(255, 61, 0, 0.8); }
      }
    `, styleSheet.cssRules.length);
} catch (e) {}

const VistaCocina = () => {
  const [pedidos, setPedidos] = useState({});
  const [ultimoUpdate, setUltimoUpdate] = useState(new Date());
  const [permisoSonido, setPermisoSonido] = useState(false);

  // --- REFS (Variables que sobreviven al intervalo) ---
  const audioRef = useRef(null);
  const prevPedidosRef = useRef(0);
  const permisoSonidoRef = useRef(false);
  const primeraCargaRef = useRef(true);

  // Inicializar audio
  useEffect(() => {
    audioRef.current = new Audio('/ding.mp3');
    audioRef.current.volume = 1.0; 
    audioRef.current.load(); 
  }, []);

  // Función principal de carga
  const cargarPedidos = async () => {
    try {
      const res = await api.get('/pedidos/cocina/activos');
      const nuevosItems = res.data.items || {};
      
      const totalItemsActuales = Object.values(nuevosItems).reduce(
        (sum, list) => sum + list.length, 
        0
      );
      
      if (primeraCargaRef.current) {
        prevPedidosRef.current = totalItemsActuales;
        primeraCargaRef.current = false;
        console.log(`📥 Carga inicial. Items: ${totalItemsActuales} (Sin sonido)`);
      } else {
        if (
          totalItemsActuales > prevPedidosRef.current && 
          permisoSonidoRef.current && 
          audioRef.current
        ) {
          console.log(`🔔 NUEVO PEDIDO! (De ${prevPedidosRef.current} a ${totalItemsActuales})`);
          
          audioRef.current.currentTime = 0;
          audioRef.current.play()
            .then(() => console.log("✅ Sonido OK"))
            .catch(e => console.error("❌ Error Audio:", e));
          
          if (navigator.vibrate) navigator.vibrate(200);
        }
        
        prevPedidosRef.current = totalItemsActuales;
      }
      
      setPedidos(nuevosItems);
      setUltimoUpdate(new Date());
      
    } catch (error) {
      console.error('Error conectando con cocina:', error);
    }
  };

  // Función para activar audio con interacción de usuario
  const activarSonido = () => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play()
      .then(() => {
        setPermisoSonido(true);
        permisoSonidoRef.current = true; 
        console.log("🔊 Sistema de audio activado");
      })
      .catch(e => {
        alert(`No se pudo reproducir el audio. Verifica que exista /public/ding.mp3`);
        console.error(e);
      });
  };

  // Intervalo (Polling)
  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 5000);
    return () => clearInterval(intervalo);
  }, []); 

  // Cambiar estado del pedido
  const avanzarEstado = async (itemId, estadoActual) => {
    const flujo = ['Pendiente', 'Listo'];
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
      
      {/* Botón flotante para activar sonido */}
      {!permisoSonido && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          animation: 'pulse-button 2s infinite'
        }}>
          <button 
            onClick={activarSonido} 
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #ff3d00, #ff6b35)',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              fontSize: '1rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(255, 61, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textTransform: 'uppercase'
            }}
          >
            <span style={{fontSize: '1.3em'}}>🔔</span>
            <span>Activar Sonido</span>
          </button>
        </div>
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