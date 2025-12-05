import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLocation } from 'wouter';
import './Registros.css';

const Registros = () => {
  const [pedidos, setPedidos] = useState([]);
  
  const hoy = new Date().toISOString().split('T')[0];
  const [fechaDesde, setFechaDesde] = useState(hoy);
  const [fechaHasta, setFechaHasta] = useState(hoy);

  const [loading, setLoading] = useState(false);
  const [totales, setTotales] = useState({ total: 0, cantidad: 0 });
  
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  
  const [, setLocation] = useLocation();

  useEffect(() => {
    cargarHistorial();
  }, [fechaDesde, fechaHasta]);

  const cargarHistorial = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/pedidos?fecha_desde=${fechaDesde} 00:00:00&fecha_hasta=${fechaHasta} 23:59:59`);
      setPedidos(res.data.pedidos);
      
      const totalDinero = res.data.pedidos.reduce((acc, p) => acc + parseFloat(p.total), 0);
      setTotales({ total: totalDinero, cantidad: res.data.pedidos.length });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalle = async (id) => {
    setCargandoDetalle(true);
    try {
      const res = await api.get(`/pedidos/${id}`);
      setPedidoSeleccionado(res.data);
    } catch (error) {
      alert('Error cargando detalles');
    } finally {
      setCargandoDetalle(false);
    }
  };

  const eliminarPedido = async (id) => {
    const confirmacion = window.confirm('⚠️ ¡Cuidado!\n\n¿Estás segura de que quieres ELIMINAR este registro permanentemente?\nEsto afectará el total de la caja.');
    
    if (!confirmacion) return;

    try {
      await api.delete(`/pedidos/${id}`);
      alert('✅ Registro eliminado correctamente.');
      cargarHistorial();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar: ' + (error.response?.data?.mensaje || error.message));
    }
  };

  return (
    <div className="registros-container">
      
      {/* HEADER */}
      <div className="registros-header animate-fade-in">
        <div className="registros-title-section">
          <button onClick={() => setLocation('/pedidos')} className="btn btn-secondary">
            ⬅️ Volver
          </button>
          <h1>
            <span>📜</span>
            Registros
          </h1>
        </div>

        {/* FILTROS DE FECHA */}
        <div className="registros-filtros">
          <div className="registros-date-group">
            <label className="registros-date-label">Desde</label>
            <input 
              type="date" 
              value={fechaDesde} 
              onChange={(e) => setFechaDesde(e.target.value)}
              className="registros-date-input"
            />
          </div>
          
          <span className="registros-date-arrow">→</span>
          
          <div className="registros-date-group">
            <label className="registros-date-label">Hasta</label>
            <input 
              type="date" 
              value={fechaHasta} 
              onChange={(e) => setFechaHasta(e.target.value)}
              className="registros-date-input"
            />
          </div>
        </div>
      </div>

      {/* RESUMEN */}
      <div className="registros-resumen animate-fade-in">
        <div className="registros-stat">
          <div className="registros-stat-label">Pedidos</div>
          <div className="registros-stat-value">{totales.cantidad}</div>
        </div>
        <div className="registros-stat">
          <div className="registros-stat-label">Total Recaudado</div>
          <div className="registros-stat-value dinero">
            ${new Intl.NumberFormat('es-AR').format(totales.total)}
          </div>
        </div>
      </div>

      {/* TABLA */}
      {loading ? (
        <div className="registros-loading">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Cargando historial...</p>
        </div>
      ) : (
        <div className="registros-tabla-container animate-fade-in">
          <table className="registros-tabla">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Cliente</th>
                <th>Cajera</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="registros-vacio">
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                    No hay registros en este rango de fechas
                  </td>
                </tr>
              ) : (
                pedidos.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="registros-fecha-hora">
                        <span className="registros-fecha">
                          {new Date(p.fecha_hora).toLocaleDateString('es-AR')}
                        </span>
                        <span className="registros-hora">
                          {new Date(p.fecha_hora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </td>
                    
                    <td>
                      <span className="registros-cliente">{p.cliente}</span>
                    </td>
                    
                    <td>
                      <span className="registros-cajera-badge">
                        <span>👤</span>
                        {p.cajera_nombre}
                      </span>
                    </td>
                    
                    <td style={{ textAlign: 'center' }}>
                      <span className="registros-estado-badge">
                        {p.estado_general}
                      </span>
                    </td>
                    
                    <td style={{ textAlign: 'right' }}>
                      <span className="registros-total">${p.total}</span>
                    </td>
                    
                    <td>
                      <div className="registros-acciones">
                        <button 
                          onClick={() => abrirDetalle(p.id)} 
                          className="registros-btn-accion registros-btn-ver"
                          title="Ver Detalle"
                        >
                          👁️
                        </button>
                        <button 
                          onClick={() => eliminarPedido(p.id)} 
                          className="registros-btn-accion registros-btn-eliminar"
                          title="Eliminar Registro"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE DETALLE */}
      {pedidoSeleccionado && (
        <div className="registros-modal-overlay" onClick={() => setPedidoSeleccionado(null)}>
          <div className="registros-modal" onClick={(e) => e.stopPropagation()}>
            
            <div className="registros-modal-header">
              <h3 className="registros-modal-title">
                Ticket #{pedidoSeleccionado.id.slice(-6)}
              </h3>
              <button 
                onClick={() => setPedidoSeleccionado(null)} 
                className="registros-modal-close"
              >
                ×
              </button>
            </div>

            <div className="registros-modal-info">
              <div className="registros-modal-info-item">
                <span className="registros-modal-info-label">Cliente:</span>
                <span className="registros-modal-info-value">{pedidoSeleccionado.cliente}</span>
              </div>
              <div className="registros-modal-info-item">
                <span className="registros-modal-info-label">Cajera:</span>
                <span className="registros-modal-info-value">{pedidoSeleccionado.cajera_nombre}</span>
              </div>
              <div className="registros-modal-info-item">
                <span className="registros-modal-info-label">Fecha:</span>
                <span className="registros-modal-info-value">
                  {new Date(pedidoSeleccionado.fecha_hora).toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <div className="registros-modal-items">
              <div className="registros-modal-items-title">Detalle del Pedido</div>
              
              {pedidoSeleccionado.items?.map(item => (
                <div key={item.id} className="registros-modal-item">
                  <div className="registros-modal-item-info">
                    <div className="registros-modal-item-nombre">
                      <span className="registros-modal-item-cantidad">
                        {item.cantidad}×
                      </span>
                      {' '}{item.producto_nombre}
                    </div>
                    
                    {item.acompanamiento_nombre && (
                      <div className="registros-modal-item-extra">
                        + {item.acompanamiento_nombre}
                      </div>
                    )}
                    
                    {item.instrucciones_especiales && (
                      <div className="registros-modal-item-nota">
                        ⚠️ {item.instrucciones_especiales}
                      </div>
                    )}
                  </div>
                  
                  <div className="registros-modal-item-subtotal">
                    ${item.subtotal}
                  </div>
                </div>
              ))}

              <div className="registros-modal-total">
                Total: ${pedidoSeleccionado.total}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registros;