import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useLocation } from 'wouter';
import AdminModal from './AdminModal';
import './AdminPanel.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('productos');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Datos auxiliares cargados una vez al abrir el modal
  const [auxCats, setAuxCats] = useState([]);
  const [auxDest, setAuxDest] = useState([]);
  const [auxAcomp, setAuxAcomp] = useState([]);
  const [listaProductos, setListaProductos] = useState([]);

  // cargarDatos usa activeTab via closure y se redefine en cada render,
  // pero el efecto solo necesita dispararse cuando activeTab cambia.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarDatos(); }, [activeTab]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'cajeras'
        ? '/auth/cajeras'
        : activeTab === 'productos'
          ? '/productos'
          : `/${activeTab}`;
      const res = await api.get(url);

      if (activeTab === 'productos') {
        setData(res.data.productos || []);
      } else if (activeTab === 'cajeras') {
        setData(res.data.cajeras || []);
      } else {
        setData(res.data || []);
      }
    } catch (error) {
      console.error(error);
      alert('Error cargando datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarAuxiliares = async () => {
    try {
      const [resCat, resDest, resAcomp, resProd] = await Promise.all([
        api.get('/categorias'),
        api.get('/destinos'),
        api.get('/acompanamientos'),
        api.get('/productos'),
      ]);
      setAuxCats(resCat.data);
      setAuxDest(resDest.data);
      setAuxAcomp(resAcomp.data);
      setListaProductos(resProd.data.productos || []);
    } catch (error) {
      console.error('Error cargando auxiliares:', error);
    }
  };

  const openModal = async (item = null) => {
    if (activeTab === 'cajeras' && item) { alert('⚠️ Edición de usuarios no disponible.'); return; }
    if (activeTab !== 'cajeras') await cargarAuxiliares();
    setEditingItem(item || {});
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (activeTab === 'cajeras') { alert('⚠️ No se pueden eliminar cajeras desde aquí.'); return; }
    if (!confirm('¿Seguro de eliminar este elemento?')) return;
    try {
      await api.delete(`/${activeTab}/${id}`);
      cargarDatos();
    } catch {
      alert('Error al eliminar');
    }
  };

  // Callbacks estables para AdminModal — no cambian entre renders de AdminPanel
  const handleClose = useCallback(() => setShowModal(false), []);

  const handleSaved = useCallback(() => {
    setShowModal(false);
    cargarDatos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Cuando el modal crea un acompañamiento rápido, actualizamos la lista
  // y agregamos el nuevo item al editingItem actual
  const handleAuxAcompCreado = useCallback((nuevoItem) => {
    setAuxAcomp(prev => [...prev, nuevoItem]);
    setEditingItem(prev => {
      if (!prev) return prev;
      const actuales = prev.acompanamientos || [];
      return { ...prev, acompanamientos: [...actuales, nuevoItem] };
    });
  }, []);

  // Cuando el modal genera/regenera imagen, actualizamos solo imagen_url
  const handleEditingItemUpdate = useCallback((changes) => {
    setEditingItem(prev => ({ ...prev, ...changes }));
  }, []);

  const tabs = [
    { id: 'productos',       label: '📦 Productos' },
    { id: 'categorias',      label: '🏷️ Categorías' },
    { id: 'acompanamientos', label: '🥄 Acompañamientos' },
    { id: 'destinos',        label: '🎯 Destinos' },
    { id: 'cajeras',         label: '👥 Cajeras' },
  ];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <h2><span>⚙️</span> Panel de Administración</h2>
          <button onClick={() => setLocation('/pedidos')} className="btn admin-btn-volver">⬅️ Volver a Caja</button>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        <div className="admin-content-header">
          <h3>Gestionar {activeTab}</h3>
          <button onClick={() => openModal()} className="btn btn-success">➕ Nuevo</button>
        </div>

        {loading ? (
          <div className="admin-loading"><p>Cargando datos...</p></div>
        ) : (
          <div className="admin-table-container animate-fade-in">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Información</th>
                  {activeTab === 'productos'       && <th>Precio / Stock</th>}
                  {activeTab === 'productos'       && <th>Categoría</th>}
                  {activeTab === 'acompanamientos' && <th>Categoría</th>}
                  {activeTab === 'acompanamientos' && <th>Stock</th>}
                  {activeTab === 'cajeras'         && <th>Usuario</th>}
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="admin-item-row">
                        {activeTab === 'productos' && (
                          item.imagen_url
                            ? <img src={item.imagen_url} alt="" className="admin-item-thumb" />
                            : <div className="admin-item-thumb admin-item-thumb-vacio">🖼️</div>
                        )}
                        <div>
                          <div className="admin-item-nombre">
                            {item.nombre}
                            {item.producto_vinculado_id && (
                              <span style={{ fontSize: '0.7rem', color: '#8b5a3c', marginLeft: '5px' }}>
                                (🔗 Vinculado)
                              </span>
                            )}
                          </div>
                          {item.descripcion && <div className="admin-item-desc">{item.descripcion}</div>}
                        </div>
                      </div>
                    </td>

                    {activeTab === 'productos' && (
                      <>
                        <td>
                          <div className="admin-precio-stock">
                            <span className="admin-precio">${item.precio}</span>
                            <span className={`admin-stock ${item.stock < 5 ? 'bajo' : 'ok'}`}>Stock: {item.stock}</span>
                          </div>
                        </td>
                        <td>{item.categoria_nombre}</td>
                      </>
                    )}

                    {activeTab === 'acompanamientos' && (
                      <>
                        <td>{item.categoria}</td>
                        <td>
                          <span className={`admin-stock ${item.stock < 10 ? 'bajo' : 'ok'}`}>
                            {item.stock} u.
                          </span>
                        </td>
                      </>
                    )}

                    {activeTab === 'cajeras' && (
                      <td style={{ color: 'var(--text-muted)' }}>@{item.usuario}</td>
                    )}

                    <td>
                      <div className="admin-actions">
                        {activeTab !== 'cajeras' && (
                          <button onClick={() => openModal(item)} className="btn admin-btn-editar">✏️ Editar</button>
                        )}
                        {activeTab !== 'cajeras' && (
                          <button onClick={() => handleDelete(item.id)} className="btn btn-danger admin-btn-eliminar">🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AdminModal
          activeTab={activeTab}
          editingItem={editingItem}
          auxCats={auxCats}
          auxDest={auxDest}
          auxAcomp={auxAcomp}
          listaProductos={listaProductos}
          onClose={handleClose}
          onSaved={handleSaved}
          onAuxAcompCreado={handleAuxAcompCreado}
          onEditingItemUpdate={handleEditingItemUpdate}
        />
      )}
    </div>
  );
};

export default AdminPanel;
