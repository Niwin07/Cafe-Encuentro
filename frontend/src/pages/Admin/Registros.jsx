import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLocation } from 'wouter';
import './Registros.css';

const Registros = () => {
  const [datosMostrados, setDatosMostrados] = useState([]);
  
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
      let url;
      let resultado = [];

      // 1. ELEGIR EL ENDPOINT CORRECTO SEGÚN EL SECTOR
      // Esto soluciona tu problema: usas la lógica del backend que ya filtra por items
      if (filtroSector === 'COCINA') {
        url = `/registros/cocina?fecha_desde=${fechaDesde} 00:00:00&fecha_hasta=${fechaHasta} 23:59:59`;
      } else if (filtroSector === 'CAFETERIA') {
        url = `/registros/cafeteria?fecha_desde=${fechaDesde} 00:00:00&fecha_hasta=${fechaHasta} 23:59:59`;
      } else {
        // General: Traemos todos los pedidos completos
        url = `/pedidos?fecha_desde=${fechaDesde} 00:00:00&fecha_hasta=${fechaHasta} 23:59:59&limite=1000`;
      }
      
      const res = await api.get(url);

      // Normalizar la respuesta porque tus endpoints devuelven estructuras ligeramente diferentes
      if (filtroSector === 'GENERAL') {
        resultado = res.data.pedidos || [];
      } else {
        // Los endpoints de registros devuelven { registros: [...] }
        resultado = res.data.registros || [];
      }

      setDatosMostrados(resultado);
      calcularTotales(resultado, filtroSector);

    } catch (error) {
      console.error(error);
      alert("Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  };

  const calcularTotales = (lista, sector) => {
    // Filtramos los que NO son cancelados
    const pedidosValidos = lista.filter(p => {
      if (!p.estado_general) return true;
      const estado = p.estado_general.toUpperCase().trim();
      return estado !== 'CANCELADO' && estado !== 'ANULADO';
    });

    let totalDinero = 0;

    // 2. CALCULAR DINERO CORRECTAMENTE
    if (sector === 'GENERAL') {
      // En general, sumamos el total de la cabecera del pedido
      totalDinero = pedidosValidos.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);
    } else {
      // En sectores, sumamos SOLO los items que corresponden a ese sector
      // Tu backend de registros agrupa los items en p.items
      pedidosValidos.forEach(p => {
        if (p.items && Array.isArray(p.items)) {
          const subtotalSector = p.items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
          totalDinero += subtotalSector;
        }
      });
    }

    setTotales({ 
      total: totalDinero, 
      cantidad: pedidosValidos.length 
    });
  };

  const abrirDetalle = async (pedido) => {
    // Si estamos en vista sectorizada, ya tenemos los items, no hace falta llamar a la API
    if (filtroSector !== 'GENERAL' && pedido.items) {
      setPedidoSeleccionado(pedido);
      return;
    }

    // Si es vista general, necesitamos cargar los detalles
    setCargandoDetalle(true);
    try {
      const res = await api.get(`/pedidos/${pedido.pedido_id || pedido.id}`);
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
      cargarHistorial(); 
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const esCancelado = (estado) => {
    if (!estado) return false;
    return estado.toUpperCase() === 'CANCELADO';
  };

  // Helper para mostrar el total correcto en la tabla
  const obtenerTotalFila = (p) => {
    if (filtroSector === 'GENERAL') return p.total;
    
    // Si es sectorizado, sumamos solo los items visibles
    if (p.items) {
      return p.items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0).toFixed(2);
    }
    return 0;
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
          <div className="registros-stat-label">Tickets {filtroSector !== 'GENERAL' ? 'con items' : ''}</div>
          <div className="registros-stat-value">{totales.cantidad}</div>
        </div>
        <div className="registros-stat">
          <div className="registros-stat-label">
            {filtroSector === 'GENERAL' ? 'Facturación Total' : `Ventas ${filtroSector}`}
          </div>
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
                {/* Cambiamos el título de la columna según el filtro */}
                <th style={{ textAlign: 'right' }}>
                    {filtroSector === 'GENERAL' ? 'Total Ticket' : 'Subtotal Sector'}
                </th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datosMostrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="registros-vacio">
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                    No hay registros en {filtroSector.toLowerCase()}.
                  </td>
                </tr>
              ) : (
                datosMostrados.map(p => {
                  const id = p.id || p.pedido_id; // Normalización de ID
                  const cancelado = esCancelado(p.estado_general);
                  
                  return (
                    <tr key={id} className={cancelado ? 'registro-cancelado' : ''}>
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
                          ${obtenerTotalFila(p)}
                        </span>
                      </td>
                      
                      <td>
                        <div className="registros-acciones">
                          <button onClick={() => abrirDetalle(p)} className="registros-btn-accion registros-btn-ver">👁️</button>
                          {filtroSector === 'GENERAL' && (
                             <button onClick={() => eliminarPedido(id)} className="registros-btn-accion registros-btn-eliminar">🗑️</button>
                          )}
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

      {/* MODAL DETALLE */}
      {pedidoSeleccionado && (
        <div className="registros-modal-overlay" onClick={() => setPedidoSeleccionado(null)}>
          <div className="registros-modal" onClick={(e) => e.stopPropagation()}>
            <div className="registros-modal-header">
              <h3 className="registros-modal-title">
                Ticket #{(pedidoSeleccionado.id || pedidoSeleccionado.pedido_id).toString().slice(-6)}
              </h3>
              <button onClick={() => setPedidoSeleccionado(null)} className="registros-modal-close">×</button>
            </div>
            
            <div className="registros-modal-info">
                <div className="registros-modal-info-item">
                    <span className="registros-modal-info-label">Cliente:</span>
                    <span className="registros-modal-info-value">{pedidoSeleccionado.cliente}</span>
                </div>
                {pedidoSeleccionado.notas && (
                    <div className="registros-modal-info-item">
                        <span className="registros-modal-info-label">Notas Gral:</span>
                        <span className="registros-modal-info-value" style={{ fontStyle: 'italic' }}>{pedidoSeleccionado.notas}</span>
                    </div>
                )}
            </div>

            <div className="registros-modal-items">
              <div className="registros-modal-items-title">
                {filtroSector === 'GENERAL' ? 'Todos los items' : `Items de ${filtroSector}`}
              </div>
              
              {pedidoSeleccionado.items?.map((item, idx) => (
                <div key={item.id || idx} className="registros-modal-item">
                  <div className="registros-modal-item-info">
                    <div className="registros-modal-item-nombre">
                        <span className="registros-modal-item-cantidad">{item.cantidad} x </span> 
                        {item.producto_nombre}
                    </div>
                    {item.acompanamiento_nombre && (
                        <div className="registros-modal-item-extra">+ {item.acompanamiento_nombre}</div>
                    )}
                    {item.instrucciones_especiales && (
                        <div className="registros-modal-item-nota">📝 {item.instrucciones_especiales}</div>
                    )}
                  </div>
                  <div className="registros-modal-item-subtotal">${item.subtotal}</div>
                </div>
              ))}
              
              <div className="registros-modal-total">
                {filtroSector === 'GENERAL' 
                    ? `Total Ticket: $${pedidoSeleccionado.total}`
                    : `Total Sector: $${obtenerTotalFila(pedidoSeleccionado)}`
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registros;