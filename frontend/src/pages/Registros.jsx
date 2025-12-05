import { useState, useEffect } from 'react';
import api from '../services/api';
import { useLocation } from 'wouter';

const Registros = () => {
  const [pedidos, setPedidos] = useState([]);
  
  // Estado para fechas (rango)
  const hoy = new Date().toISOString().split('T')[0];
  const [fechaDesde, setFechaDesde] = useState(hoy);
  const [fechaHasta, setFechaHasta] = useState(hoy);

  const [loading, setLoading] = useState(false);
  const [totales, setTotales] = useState({ total: 0, cantidad: 0 });
  
  // Estado para el modal de detalles
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

  // --- NUEVA FUNCIÓN: ELIMINAR ---
  const eliminarPedido = async (id) => {
    // 1. Confirmación de seguridad
    const confirmacion = window.confirm('⚠️ ¡Cuidado!\n\n¿Estás segura de que quieres ELIMINAR este registro permanentemente?\nEsto afectará el total de la caja.');
    
    if (!confirmacion) return;

    try {
      // 2. Llamada a la API (Asumiendo que tu backend soporta DELETE /pedidos/:id)
      await api.delete(`/pedidos/${id}`);
      
      alert('Registro eliminado correctamente.');
      
      // 3. Recargar la lista para actualizar totales y tabla
      cargarHistorial();

    } catch (error) {
      console.error(error);
      alert('Error al eliminar: ' + (error.response?.data?.mensaje || error.message));
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => setLocation('/pedidos')} className="btn" style={{ background: '#8b5a3c' }}>⬅️ Volver</button>
          <h1 style={{ margin: 0, fontSize: '1.8em' }}>📜 Registro</h1>
        </div>

        {/* FILTROS DE FECHA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.7em', color: '#666', fontWeight: 'bold' }}>Desde:</label>
            <input 
              type="date" 
              value={fechaDesde} 
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <span style={{ fontSize: '1.2em', color: '#8b5a3c' }}>➜</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.7em', color: '#666', fontWeight: 'bold' }}>Hasta:</label>
            <input 
              type="date" 
              value={fechaHasta} 
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
        </div>
      </div>

      {/* RESUMEN */}
      <div style={{ background: '#3e2723', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-around' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.9em', opacity: 0.8 }}>Pedidos en rango</div>
          <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{totales.cantidad}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.9em', opacity: 0.8 }}>Total recaudado</div>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#4caf50' }}>
            ${new Intl.NumberFormat('es-AR').format(totales.total)}
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      {loading ? <p style={{textAlign: 'center', marginTop: '20px'}}>Cargando historial...</p> : (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f4e9d8', color: '#5d4037' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left' }}>Fecha y Hora</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Cajera</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr><td colSpan="6" style={{padding:'20px', textAlign:'center'}}>No hay registros en este rango.</td></tr>
              ) : (
                pedidos.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>
                      {new Date(p.fecha_hora).toLocaleDateString()} <br/>
                      <small style={{color: '#888'}}>{new Date(p.fecha_hora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.cliente}</td>
                    <td style={{ padding: '12px' }}><span style={{background:'#e0f2f1', color:'#00695c', padding:'2px 6px', borderRadius:'4px', fontSize:'0.9em'}}>👤 {p.cajera_nombre}</span></td>
                    <td style={{ padding: '12px', textAlign:'center' }}>{p.estado_general}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight:'bold' }}>${p.total}</td>
                    
                    {/* COLUMNA ACCIONES MODIFICADA */}
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        {/* Botón Ver */}
                        <button 
                          onClick={() => abrirDetalle(p.id)} 
                          title="Ver Detalle"
                          style={{ padding: '6px 10px', fontSize: '1.2em', background: '#2196f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          👁️
                        </button>
                        
                        {/* Botón Borrar */}
                        <button 
                          onClick={() => eliminarPedido(p.id)} 
                          title="Eliminar Registro"
                          style={{ padding: '6px 10px', fontSize: '1.2em', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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

      {/* MODAL DE DETALLE (Sin cambios) */}
      {pedidoSeleccionado && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', width: '90%', maxWidth: '500px', borderRadius: '12px', padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Ticket #{pedidoSeleccionado.id.slice(-6)}</h3>
              <button onClick={() => setPedidoSeleccionado(null)} style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ marginBottom: '15px', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
              <p style={{ margin: '5px 0' }}><strong>Cliente:</strong> {pedidoSeleccionado.cliente}</p>
              <p style={{ margin: '5px 0' }}><strong>Cajera:</strong> {pedidoSeleccionado.cajera_nombre}</p>
              <p style={{ margin: '5px 0' }}><strong>Fecha:</strong> {new Date(pedidoSeleccionado.fecha_hora).toLocaleString()}</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
              <thead style={{ borderBottom: '2px solid #eee' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Cant.</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Producto</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {pedidoSeleccionado.items?.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px dashed #eee' }}>
                    <td style={{ padding: '8px' }}>x{item.cantidad}</td>
                    <td style={{ padding: '8px' }}>
                      <div>{item.producto_nombre}</div>
                      {item.acompanamiento_nombre && <div style={{ fontSize: '0.85em', color: '#666' }}>+ {item.acompanamiento_nombre}</div>}
                      {item.instrucciones_especiales && <div style={{ fontSize: '0.85em', color: '#f57c00' }}>⚠️ {item.instrucciones_especiales}</div>}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>${item.subtotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', fontSize: '1.3em', fontWeight: 'bold', borderTop: '2px solid #333', paddingTop: '10px' }}>
              Total: ${pedidoSeleccionado.total}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registros;