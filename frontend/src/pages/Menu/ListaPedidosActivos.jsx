import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Package, ChevronRight, ChevronDown, User, Sparkles, Loader2,
  CheckCircle2, Flame, Clock, Trash2, FileText,
} from 'lucide-react';
import './ListaPedidosActivos.css';

const ListaPedidosActivos = () => {
  const toast = useToast();
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
    const ok = await toast.confirm('¿Entregar este pedido al cliente?', {
      title: 'Entregar pedido',
      confirmLabel: 'Entregar',
    });
    if (!ok) return;
    try {
      await api.patch(`/pedidos/${pedidoId}/entregar`);
      toast.success('Pedido entregado.');
      cargarPedidos();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || error.message);
    }
  };

  const cancelarPedido = async (e, pedidoId) => {
    e.stopPropagation();
    const ok = await toast.confirm('¿Estás segura de cancelar este pedido? Se devolverá el stock.', {
      title: 'Cancelar pedido',
      confirmLabel: 'Sí, cancelar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/pedidos/${pedidoId}/cancelar`);
      toast.success('Pedido cancelado correctamente.');
      cargarPedidos();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || error.message);
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
          <h3><Package size={18} className="pedidos-header-icon" aria-hidden="true" /> Pedidos Activos</h3>
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
            <Loader2 size={40} className="animate-spin" aria-hidden="true" />
            <p>Cargando pedidos...</p>
          </div>
        ) : totalPedidos === 0 ? (
          <div className="pedidos-vacio">
            <Sparkles size={40} className="pedidos-vacio-icono" aria-hidden="true" />
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
            
            // Calcular total del pedido - CAMPO CORRECTO: precio_unitario
            const totalPedido = items.reduce((sum, item) => {
              const precio = parseFloat(item.precio_unitario) || 0;
              const cantidad = parseInt(item.cantidad) || 0;
              return sum + (precio * cantidad);
            }, 0);
            
            return (
              <div
                key={id}
                className={`pedido-card ${listosParaEntregar ? 'pedido-listo' : ''} ${isExpanded ? 'pedido-expanded' : ''}`}
                onClick={() => toggleExpand(id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(id);
                  }
                }}
              >
                {/* Header del pedido */}
                <div className="pedido-card-header">
                  <div className="pedido-info">
                    <div className="pedido-cliente">
                      <span className="pedido-icono-expand" aria-hidden="true">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <strong>{cliente}</strong>
                    </div>
                    <div className="pedido-cajera">
                      <User size={12} aria-hidden="true" /> {cajera}
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
                        // USAR subtotal si viene del backend, sino calcular
                        const subtotalItem = item.subtotal 
                          ? parseFloat(item.subtotal) 
                          : (parseFloat(item.precio_unitario) || 0) * (parseInt(item.cantidad) || 0);
                        
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
                                  <FileText size={12} aria-hidden="true" /> {item.instrucciones_especiales}
                                </div>
                              )}
                            </div>
                            <div className="item-info" style={{ textAlign: 'right', minWidth: 'fit-content' }}>
                              <div
                                className={`item-estado estado-${item.estado.toLowerCase().replace(' ', '-')}`}
                                title={item.estado}
                                aria-label={item.estado}
                              >
                                {item.estado === 'Listo' ? <CheckCircle2 size={18} /> : item.estado === 'En Preparación' ? <Flame size={18} /> : <Clock size={18} />}
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
                          <Clock size={12} aria-hidden="true" /> {estados.pendiente} pendiente{estados.pendiente > 1 ? 's' : ''}
                        </span>
                      )}
                      {estados.enPrep > 0 && (
                        <span className="badge badge-info">
                          <Flame size={12} aria-hidden="true" /> {estados.enPrep} en preparación
                        </span>
                      )}
                      {estados.listo > 0 && (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} aria-hidden="true" /> {estados.listo} listo{estados.listo > 1 ? 's' : ''}
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
                      <CheckCircle2 size={16} aria-hidden="true" /> ENTREGAR
                    </button>
                  ) : (
                    <div className="pedido-en-proceso">
                      <Clock size={14} aria-hidden="true" /> En proceso...
                    </div>
                  )}

                  <button
                    onClick={(e) => cancelarPedido(e, id)}
                    className="btn btn-danger pedido-btn-cancelar"
                    title="Cancelar pedido"
                    aria-label="Cancelar pedido"
                  >
                    <Trash2 size={16} />
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