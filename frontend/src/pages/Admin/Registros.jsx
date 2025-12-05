import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLocation } from 'wouter';
import './Registros.css';

const Registros = () => {
  const [pedidos, setPedidos] = useState([]);
  
  const hoy = new Date().toISOString().split('T')[0];
  const [fechaDesde, setFechaDesde] = useState(hoy);
  const [fechaHasta, setFechaHasta] = useState(hoy);
  
  // Filtro de sector
  const [filtroSector, setFiltroSector] = useState('GENERAL'); 

  const [loading, setLoading] = useState(false);
  const [totales, setTotales] = useState({ total: 0, cantidad: 0 });
  
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  
  const [, setLocation] = useLocation();

  useEffect(() => {
    cargarHistorial();
  }, [fechaDesde, fechaHasta, filtroSector]);

  const cargarHistorial = async () => {
    setLoading(true);
    try {
      // 1. Construir URL con el parámetro de sector
      const sectorQuery = filtroSector !== 'GENERAL' ? `&sector=${filtroSector}` : '';
      const url = `/pedidos?fecha_desde=${fechaDesde} 00:00:00&fecha_hasta=${fechaHasta} 23:59:59${sectorQuery}`;
      
      const res = await api.get(url);
      let datos = res.data.pedidos || [];

      // 2. FILTRO DE SEGURIDAD (CLIENT-SIDE)
      // Si el backend te devuelve todo mezclado (ignora el param), lo filtramos aquí también si el registro tiene el campo 'sector'
      if (filtroSector !== 'GENERAL') {
        datos = datos.filter(p => {
          // Si el registro tiene propiedad 'sector' o 'destino', la usamos. Si no, asumimos que el backend ya filtró.
          const sectorPedido = p.sector || p.destino; 
          return sectorPedido ? sectorPedido.toUpperCase() === filtroSector : true;
        });
      }

      setPedidos(datos);
      
      // 3. CÁLCULO DE TOTALES (Lógica corregida)
      calcularTotales(datos);

    } catch (error) {
      console.error(error);
      alert("Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  };

  const calcularTotales = (listaPedidos) => {
    // Filtramos los que NO son cancelados para la suma
    const pedidosValidos = listaPedidos.filter(p => {
      if (!p.estado_general) return true; // Si no tiene estado, lo contamos por seguridad
      const estado = p.estado_general.toUpperCase().trim();
      return estado !== 'CANCELADO' && estado !== 'ANULADO' && estado !== 'ELIMINADO';
    });

    // Sumamos con cuidado de convertir strings a números
    const totalDinero = pedidosValidos.reduce((acc, p) => {
      return acc + (parseFloat(p.total) || 0);
    }, 0);

    setTotales({ 
      total: totalDinero, 
      cantidad: pedidosValidos.length 
    });
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
    if (!window.confirm('⚠️ ¿Estás segura de eliminar este registro? Afectará la caja.')) return;

    try {
      await api.delete(`/pedidos/${id}`);
      // Recargamos para que se actualicen los totales
      cargarHistorial(); 
    } catch (error) {
      console.error(error);
      alert('Error al eliminar');
    }
  };

  // Helper para verificar si un pedido está cancelado visualmente
  const esCancelado = (estado) => {
    if (!estado) return false;
    const est = estado.toUpperCase().trim();
    return est === 'CANCELADO' || est === 'ANULADO';
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
            Registros {filtroSector !== 'GENERAL' ? `(${filtroSector})` : ''}
          </h1>
        </div>

        {/* TABS SELECTOR DE DESTINO */}
        <div className="registros-tabs">
          {['GENERAL', 'COCINA', 'CAFETERIA'].map(sector => (
            <button 
              key={sector}
              className={`registros-tab ${filtroSector === sector ? 'active' : ''}`}
              onClick={() => setFiltroSector(sector)}
            >
              {sector === 'GENERAL' ? 'Todo' : sector === 'COCINA' ? '🍳 Cocina' : '☕ Cafetería'}
            </button>
          ))}
        </div>

        {/* FILTROS FECHA */}
        <div className="registros-filtros">
          <div className="registros-date-group">
            <label className="registros-date-label">Desde</label>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="registros-date-input"/>
          </div>
          <span className="registros-date-arrow">→</span>
          <div className="registros-date-group">
            <label className="registros-date-label">Hasta</label>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="registros-date-input"/>
          </div>
        </div>
      </div>

      {/* RESUMEN (TOTALES) */}
      <div className="registros-resumen animate-fade-in">
        <div className="registros-stat">
          <div className="registros-stat-label">Cantidad (Válidos)</div>
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
          <p>Filtrando registros...</p>
        </div>
      ) : (
        <div className="registros-tabla-container animate-fade-in">
          <table className="registros-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
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
                    No hay registros en {filtroSector.toLowerCase()}.
                  </td>
                </tr>
              ) : (
                pedidos.map(p => {
                  const cancelado = esCancelado(p.estado_general);
                  return (
                    <tr key={p.id} className={cancelado ? 'registro-cancelado' : ''}>
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
                      
                      <td><span className="registros-cliente">{p.cliente}</span></td>
                      
                      <td>
                        <span className="registros-cajera-badge">
                          {p.cajera_nombre}
                        </span>
                      </td>
                      
                      <td style={{ textAlign: 'center' }}>
                        <span className={`registros-estado-badge ${cancelado ? 'estado-cancelado' : ''}`}>
                          {p.estado_general}
                        </span>
                      </td>
                      
                      <td style={{ textAlign: 'right' }}>
                        <span className="registros-total" style={{ textDecoration: cancelado ? 'line-through' : 'none', opacity: cancelado ? 0.5 : 1 }}>
                          ${p.total}
                        </span>
                      </td>
                      
                      <td>
                        <div className="registros-acciones">
                          <button onClick={() => abrirDetalle(p.id)} className="registros-btn-accion registros-btn-ver">👁️</button>
                          <button onClick={() => eliminarPedido(p.id)} className="registros-btn-accion registros-btn-eliminar">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DETALLE (Igual que antes, solo lo mantengo para contexto) */}
      {pedidoSeleccionado && (
        <div className="registros-modal-overlay" onClick={() => setPedidoSeleccionado(null)}>
          <div className="registros-modal" onClick={(e) => e.stopPropagation()}>
            <div className="registros-modal-header">
              <h3 className="registros-modal-title">Ticket #{pedidoSeleccionado.id.slice(-6)}</h3>
              <button onClick={() => setPedidoSeleccionado(null)} className="registros-modal-close">×</button>
            </div>
            <div className="registros-modal-items">
              {pedidoSeleccionado.items?.map(item => (
                <div key={item.id} className="registros-modal-item">
                  <div className="registros-modal-item-info">
                    {item.cantidad} x {item.producto_nombre}
                  </div>
                  <div className="registros-modal-item-subtotal">${item.subtotal}</div>
                </div>
              ))}
              <div className="registros-modal-total">Total: ${pedidoSeleccionado.total}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registros;