import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLocation } from 'wouter';
import './AdminPanel.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('productos');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [auxCats, setAuxCats] = useState([]);
  const [auxDest, setAuxDest] = useState([]);
  const [auxAcomp, setAuxAcomp] = useState([]);

  const [nuevoAcompNombre, setNuevoAcompNombre] = useState('');
  const [nuevoAcompCategoria, setNuevoAcompCategoria] = useState('Bebida');
  const [creandoAcomp, setCreandoAcomp] = useState(false);

  const [filtroAcomp, setFiltroAcomp] = useState('');

  useEffect(() => {
    cargarDatos();
  }, [activeTab]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      let url = activeTab === 'cajeras' ? '/auth/cajeras' : activeTab === 'productos' ? '/productos' : `/${activeTab}`;
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
      const [resCat, resDest, resAcomp] = await Promise.all([
        api.get('/categorias'),
        api.get('/destinos'),
        api.get('/acompanamientos')
      ]);
      setAuxCats(resCat.data);
      setAuxDest(resDest.data);
      setAuxAcomp(resAcomp.data);
    } catch (error) {
      console.error("Error cargando auxiliares:", error);
    }
  };

  const handleQuickCreateAcomp = async (e) => {
    e.preventDefault();
    if (!nuevoAcompNombre.trim()) return;

    setCreandoAcomp(true);
    try {
      const res = await api.post('/acompanamientos', {
        nombre: nuevoAcompNombre,
        categoria: nuevoAcompCategoria
      });

      const nuevoItem = { id: res.data.id, nombre: nuevoAcompNombre, categoria: nuevoAcompCategoria };
      setAuxAcomp([...auxAcomp, nuevoItem]);

      if (editingItem) {
        const actuales = editingItem.acompanamientos || [];
        setEditingItem({
          ...editingItem,
          acompanamientos: [...actuales, nuevoItem]
        });
      }

      setNuevoAcompNombre('');
      alert('✨ Opción creada y asignada!');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setCreandoAcomp(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const payload = {};
    const acompIds = [];

    for (const [key, value] of formData.entries()) {
        if (key === 'acompanamientos') {
            acompIds.push(parseInt(value));
        } else {
            payload[key] = value;
        }
    }
    
    if (activeTab === 'productos') {
        payload.acompanamientos_ids = acompIds;
    }

    try {
      if (activeTab === 'cajeras') {
        await api.post('/auth/registro', payload);
      } else {
        if (editingItem && editingItem.id) {
          await api.put(`/${activeTab}/${editingItem.id}`, payload);
        } else {
          await api.post(`/${activeTab}`, payload);
        }
      }
      
      alert('✅ Guardado correctamente');
      setShowModal(false);
      cargarDatos();
    } catch (error) {
      alert('Error al guardar: ' + (error.response?.data?.mensaje || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (activeTab === 'cajeras') {
        alert("⚠️ Por seguridad, no se pueden eliminar cajeras desde aquí.");
        return;
    }

    if (!confirm('¿Seguro de eliminar este elemento?')) return;
    
    try {
      await api.delete(`/${activeTab}/${id}`);
      cargarDatos();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const openModal = async (item = null) => {
    if (activeTab === 'cajeras' && item) {
        alert("⚠️ La edición de usuarios no está disponible en este panel.");
        return;
    }

    if (activeTab === 'productos') await cargarAuxiliares();
    setEditingItem(item || {});
    setShowModal(true);
    setFiltroAcomp('');
  };

  const tabs = [
    { id: 'productos', label: '📦 Productos' },
    { id: 'categorias', label: '🏷️ Categorías' },
    { id: 'acompanamientos', label: '🥄 Acompañamientos' },
    { id: 'destinos', label: '🎯 Destinos' },
    { id: 'cajeras', label: '👥 Cajeras' }
  ];

  return (
    <div className="admin-container">
      
      {/* HEADER */}
      <div className="admin-header">
        <div className="admin-header-content">
          <h2>
            <span>⚙️</span>
            Panel de Administración
          </h2>
          <button onClick={() => setLocation('/pedidos')} className="btn admin-btn-volver">
            ⬅️ Volver a Caja
          </button>
        </div>
      </div>

      {/* TABS */}
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

      {/* CONTENIDO */}
      <div className="admin-content">
        <div className="admin-content-header">
          <h3>Gestionar {activeTab}</h3>
          <button onClick={() => openModal()} className="btn btn-success">
            ➕ Nuevo
          </button>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Cargando datos...</p>
          </div>
        ) : (
          <div className="admin-table-container animate-fade-in">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Información</th>
                  {activeTab === 'productos' && (
                    <>
                      <th>Precio / Stock</th>
                      <th>Categoría</th>
                    </>
                  )}
                  {activeTab === 'cajeras' && <th>Usuario</th>}
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="admin-item-nombre">{item.nombre}</div>
                      {item.descripcion && (
                        <div className="admin-item-desc">{item.descripcion}</div>
                      )}
                    </td>
                    
                    {activeTab === 'productos' && (
                      <>
                        <td>
                          <div className="admin-precio-stock">
                            <span className="admin-precio">${item.precio}</span>
                            <span className={`admin-stock ${item.stock < 5 ? 'bajo' : 'ok'}`}>
                              Stock: {item.stock}
                            </span>
                          </div>
                        </td>
                        <td>{item.categoria_nombre}</td>
                      </>
                    )}

                    {activeTab === 'cajeras' && (
                      <td style={{ color: 'var(--text-muted)' }}>@{item.usuario}</td>
                    )}

                    <td>
                      <div className="admin-actions">
                        {activeTab !== 'cajeras' && (
                          <button onClick={() => openModal(item)} className="btn admin-btn-editar">
                            ✏️ Editar
                          </button>
                        )}
                        {activeTab !== 'cajeras' && (
                          <button onClick={() => handleDelete(item.id)} className="btn btn-danger admin-btn-eliminar">
                            🗑️
                          </button>
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

      {/* MODAL */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            
            <div className="admin-modal-header">
              <h3>{editingItem.id ? 'Editar' : 'Crear'} {activeTab === 'cajeras' ? 'Cajera' : activeTab.slice(0, -1)}</h3>
            </div>

            <div className="admin-modal-body">
              <form onSubmit={handleSave} className="admin-form">
                
                <div className="admin-form-group">
                  <label className="admin-form-label">Nombre</label>
                  <input name="nombre" defaultValue={editingItem?.nombre} required />
                </div>

                {activeTab === 'cajeras' && (
                  <>
                    <div className="admin-form-group">
                      <label className="admin-form-label">Usuario (Login)</label>
                      <input name="usuario" required placeholder="Ej: cajera1" />
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-form-label">Contraseña</label>
                      <input name="password" type="password" required minLength="6" />
                    </div>
                  </>
                )}

                {activeTab !== 'cajeras' && activeTab !== 'acompanamientos' && (
                  <div className="admin-form-group">
                    <label className="admin-form-label">Descripción</label>
                    <textarea name="descripcion" defaultValue={editingItem?.descripcion} rows="3" />
                  </div>
                )}

                {activeTab === 'productos' && (
                  <>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-form-label">💵 Precio</label>
                        <input name="precio" type="number" step="0.01" defaultValue={editingItem?.precio} required />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-form-label">📦 Stock</label>
                        <input name="stock" type="number" defaultValue={editingItem?.stock} required />
                      </div>
                    </div>

                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-form-label">🏷️ Categoría</label>
                        <select name="categoria_id" defaultValue={editingItem?.categoria_id} required>
                          <option value="">-- Seleccionar --</option>
                          {auxCats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-form-label">🎯 Destino</label>
                        <select name="destino_id" defaultValue={editingItem?.destino_id} required>
                          <option value="">-- Seleccionar --</option>
                          {auxDest.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="admin-acomp-section">
                      <label className="admin-form-label">🥄 Opciones / Acompañamientos</label>

                      <div className="admin-acomp-quick-create">
                        <input 
                          placeholder="Nueva opción..." 
                          value={nuevoAcompNombre}
                          onChange={e => setNuevoAcompNombre(e.target.value)}
                          style={{ flex: 2 }}
                        />
                        <select 
                          value={nuevoAcompCategoria}
                          onChange={e => setNuevoAcompCategoria(e.target.value)}
                          style={{ flex: 1 }}
                        >
                          <option value="Bebida">Bebida</option>
                          <option value="Comida">Comida</option>
                          <option value="Extra">Extra</option>
                          <option value="Endulzante">Endulzante</option>
                        </select>
                        <button type="button" onClick={handleQuickCreateAcomp} disabled={creandoAcomp} className="btn btn-sm" style={{ background: 'var(--success)' }}>
                          {creandoAcomp ? '...' : 'Crear'}
                        </button>
                      </div>

                      <input 
                        placeholder="🔍 Buscar..." 
                        value={filtroAcomp}
                        onChange={e => setFiltroAcomp(e.target.value)}
                        className="admin-acomp-search"
                      />

                      <div className="admin-acomp-grid">
                        {auxAcomp
                          .filter(ac => ac.nombre.toLowerCase().includes(filtroAcomp.toLowerCase()))
                          .map(ac => {
                            const isChecked = editingItem?.acompanamientos?.some(a => a.id === ac.id);
                            return (
                              <label key={ac.id} className={`admin-acomp-checkbox ${isChecked ? 'checked' : ''}`}>
                                <input 
                                  type="checkbox" 
                                  name="acompanamientos" 
                                  value={ac.id} 
                                  defaultChecked={isChecked} 
                                />
                                {ac.nombre}
                                <span className="admin-acomp-cat">({ac.categoria})</span>
                              </label>
                            )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'acompanamientos' && (
                  <div className="admin-form-group">
                    <label className="admin-form-label">Categoría</label>
                    <select name="categoria" defaultValue={editingItem?.categoria} required>
                      <option value="Bebida">Bebida</option>
                      <option value="Comida">Comida</option>
                      <option value="Extra">Extra</option>
                      <option value="Endulzante">Endulzante</option>
                    </select>
                  </div>
                )}

                <div className="admin-modal-footer">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    💾 Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;