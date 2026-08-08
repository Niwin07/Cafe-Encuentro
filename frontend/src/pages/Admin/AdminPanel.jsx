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
  
  // Estados para los selectores
  const [auxCats, setAuxCats] = useState([]);
  const [auxDest, setAuxDest] = useState([]);
  const [auxAcomp, setAuxAcomp] = useState([]);
  
  // NUEVO: Estado para la lista de productos (para vincular stock)
  const [listaProductos, setListaProductos] = useState([]); 

  const [nuevoAcompNombre, setNuevoAcompNombre] = useState('');
  const [nuevoAcompCategoria, setNuevoAcompCategoria] = useState('Bebida');
  const [creandoAcomp, setCreandoAcomp] = useState(false);

  // Generación de imagen con IA
  const [imagenReferenciaUrl, setImagenReferenciaUrl] = useState('');
  const [generandoImagen, setGenerandoImagen] = useState(false);

  const [filtroAcomp, setFiltroAcomp] = useState('');

  useEffect(() => { cargarDatos(); }, [activeTab]);

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
    } finally { setLoading(false); }
  };

  const cargarAuxiliares = async () => {
    try {
      // MODIFICADO: Ahora cargamos también /productos para tener la lista de vinculación
      const [resCat, resDest, resAcomp, resProd] = await Promise.all([
        api.get('/categorias'),
        api.get('/destinos'),
        api.get('/acompanamientos'),
        api.get('/productos') 
      ]);
      setAuxCats(resCat.data);
      setAuxDest(resDest.data);
      setAuxAcomp(resAcomp.data);
      // Guardamos los productos en el nuevo estado
      setListaProductos(resProd.data.productos || []);
    } catch (error) { console.error("Error cargando auxiliares:", error); }
  };

  const handleQuickCreateAcomp = async (e) => {
    e.preventDefault();
    if (!nuevoAcompNombre.trim()) return;
    setCreandoAcomp(true);
    try {
      const res = await api.post('/acompanamientos', {
        nombre: nuevoAcompNombre,
        categoria: nuevoAcompCategoria,
        stock: 50 
      });
      const nuevoItem = { id: res.data.id, nombre: nuevoAcompNombre, categoria: nuevoAcompCategoria, stock: 50 };
      setAuxAcomp([...auxAcomp, nuevoItem]);
      if (editingItem) {
        const actuales = editingItem.acompanamientos || [];
        setEditingItem({ ...editingItem, acompanamientos: [...actuales, nuevoItem] });
      }
      setNuevoAcompNombre('');
      alert('✨ Opción creada!');
    } catch (error) { alert('Error: ' + error.message); } finally { setCreandoAcomp(false); }
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
    
    if (activeTab === 'productos') payload.acompanamientos_ids = acompIds;

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
    if (activeTab === 'cajeras') { alert("⚠️ No se pueden eliminar cajeras desde aquí."); return; }
    if (!confirm('¿Seguro de eliminar este elemento?')) return;
    try {
      await api.delete(`/${activeTab}/${id}`);
      cargarDatos();
    } catch (error) { alert('Error al eliminar'); }
  };

  const openModal = async (item = null) => {
    if (activeTab === 'cajeras' && item) { alert("⚠️ Edición de usuarios no disponible."); return; }
    
    // MODIFICADO: Cargamos auxiliares siempre que no sea cajeras, 
    // para tener las listas listas (incluyendo productos para vincular)
    if (activeTab !== 'cajeras') await cargarAuxiliares();
    
    setEditingItem(item || {});
    setShowModal(true);
    setFiltroAcomp('');
    setImagenReferenciaUrl('');
  };

  const handleGenerarImagen = async () => {
    if (!editingItem?.id) return;
    setGenerandoImagen(true);
    try {
      const res = await api.post(`/productos/${editingItem.id}/generar-imagen`, {
        imagen_referencia_url: imagenReferenciaUrl || undefined
      });
      setEditingItem({ ...editingItem, imagen_url: res.data.imagen_url });
    } catch (error) {
      alert('Error al generar la imagen: ' + (error.response?.data?.mensaje || error.message));
    } finally {
      setGenerandoImagen(false);
    }
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
      <div className="admin-header">
        <div className="admin-header-content">
          <h2><span>⚙️</span> Panel de Administración</h2>
          <button onClick={() => setLocation('/pedidos')} className="btn admin-btn-volver">⬅️ Volver a Caja</button>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}>{tab.label}</button>
        ))}
      </div>

      <div className="admin-content">
        <div className="admin-content-header">
          <h3>Gestionar {activeTab}</h3>
          <button onClick={() => openModal()} className="btn btn-success">➕ Nuevo</button>
        </div>

        {loading ? <div className="admin-loading"><p>Cargando datos...</p></div> : (
          <div className="admin-table-container animate-fade-in">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Información</th>
                  {activeTab === 'productos' && <th>Precio / Stock</th>}
                  {activeTab === 'productos' && <th>Categoría</th>}
                  
                  {activeTab === 'acompanamientos' && <th>Categoría</th>}
                  {activeTab === 'acompanamientos' && <th>Stock</th>}
                  
                  {activeTab === 'cajeras' && <th>Usuario</th>}
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
                            {/* Mostrar indicador si está vinculado */}
                            {item.producto_vinculado_id && (
                                <span style={{fontSize:'0.7rem', color:'#8b5a3c', marginLeft:'5px'}}>
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

                    {activeTab === 'cajeras' && <td style={{ color: 'var(--text-muted)' }}>@{item.usuario}</td>}

                    <td>
                      <div className="admin-actions">
                        {activeTab !== 'cajeras' && <button onClick={() => openModal(item)} className="btn admin-btn-editar">✏️ Editar</button>}
                        {activeTab !== 'cajeras' && <button onClick={() => handleDelete(item.id)} className="btn btn-danger admin-btn-eliminar">🗑️</button>}
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
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingItem.id ? 'Editar' : 'Crear'} {activeTab}</h3>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleSave} className="admin-form">
                
                <div className="admin-form-group">
                  <label className="admin-form-label">Nombre</label>
                  <input name="nombre" defaultValue={editingItem?.nombre} required />
                </div>

                {/* PRODUCTOS */}
                {activeTab === 'productos' && (
                  <>
                    <div className="admin-form-group">
                        <label className="admin-form-label">Descripción</label>
                        <textarea name="descripcion" defaultValue={editingItem?.descripcion} rows="3" />
                    </div>

                    <div className="admin-form-group admin-imagen-ia">
                        <label className="admin-form-label">🖼️ Imagen del producto (generada con IA)</label>

                        {editingItem?.id ? (
                          <>
                            {editingItem?.imagen_url && (
                              <img src={editingItem.imagen_url} alt="Vista previa" className="admin-imagen-preview" />
                            )}
                            <input
                                placeholder="URL de imagen de referencia (opcional)"
                                value={imagenReferenciaUrl}
                                onChange={e => setImagenReferenciaUrl(e.target.value)}
                            />
                            <small style={{fontSize:'0.7rem', color:'#666', marginTop:'2px', display: 'block'}}>
                                Se genera a partir del nombre y la descripción. Si pegás una URL de imagen de referencia, la IA la usa como guía.
                            </small>
                            <button
                                type="button"
                                onClick={handleGenerarImagen}
                                disabled={generandoImagen}
                                className="btn btn-sm btn-secondary"
                                style={{marginTop: '0.5rem'}}
                            >
                                {generandoImagen ? '✨ Generando...' : (editingItem?.imagen_url ? '🔄 Regenerar imagen' : '✨ Generar imagen')}
                            </button>
                          </>
                        ) : (
                          <small style={{fontSize:'0.75rem', color:'#666'}}>
                              Guardá el producto primero; después podés generarle una imagen desde "Editar".
                          </small>
                        )}
                    </div>

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
                    
                    {/* SECCIÓN OPCIONES (Solo creación rápida, la vinculación es para la otra pestaña) */}
                    <div className="admin-acomp-section">
                      <label className="admin-form-label">🥄 Opciones / Acompañamientos</label>
                      <input placeholder="🔍 Buscar..." value={filtroAcomp} onChange={e => setFiltroAcomp(e.target.value)} className="admin-acomp-search" />
                      <div className="admin-acomp-grid">
                        {auxAcomp.filter(ac => ac.nombre.toLowerCase().includes(filtroAcomp.toLowerCase())).map(ac => {
                            const isChecked = editingItem?.acompanamientos?.some(a => a.id === ac.id);
                            return (
                              <label key={ac.id} className={`admin-acomp-checkbox ${isChecked ? 'checked' : ''}`}>
                                <input type="checkbox" name="acompanamientos" value={ac.id} defaultChecked={isChecked} />
                                {ac.nombre} <span className="admin-acomp-cat">({ac.stock})</span>
                              </label>
                            )
                        })}
                      </div>
                      
                      <div style={{marginTop: '1rem', borderTop: '1px dashed #ccc', paddingTop: '0.5rem'}}>
                        <small>¿No encuentras la opción? Créala rápido:</small>
                        <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                            <input 
                                placeholder="Nombre (ej: Hielo)" 
                                value={nuevoAcompNombre}
                                onChange={e => setNuevoAcompNombre(e.target.value)}
                                style={{flex: 1}}
                            />
                            <select 
                                value={nuevoAcompCategoria}
                                onChange={e => setNuevoAcompCategoria(e.target.value)}
                                style={{width: '120px'}}
                            >
                                <option value="Bebida">Bebida</option>
                                <option value="Extra">Extra</option>
                                <option value="Comida">Comida</option>
                            </select>
                            <button 
                                type="button" 
                                onClick={handleQuickCreateAcomp}
                                disabled={creandoAcomp || !nuevoAcompNombre}
                                className="btn btn-sm btn-secondary"
                            >
                                {creandoAcomp ? '...' : 'Crear'}
                            </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ACOMPAÑAMIENTOS (Aquí está la magia de vinculación) */}
                {activeTab === 'acompanamientos' && (
                  <>
                    <div className="admin-form-row">
                        <div className="admin-form-group">
                            <label className="admin-form-label">Categoría</label>
                            <select name="categoria" defaultValue={editingItem?.categoria} required>
                            <option value="Bebida">Bebida</option>
                            <option value="Comida">Comida</option>
                            <option value="Extra">Extra</option>
                            <option value="Endulzante">Endulzante</option>
                            <option value="Otro">Otro</option>
                            </select>
                        </div>
                        
                        {/* Selector de Producto Vinculado */}
                        <div className="admin-form-group">
                            <label className="admin-form-label">🔗 Vincular Stock (Opcional)</label>
                            <select 
                                name="producto_vinculado_id" 
                                defaultValue={editingItem?.producto_vinculado_id || ""}
                                onChange={(e) => {
                                    // Deshabilitar input manual si se selecciona un producto
                                    const inputStock = document.getElementById('input-stock-acomp');
                                    if (inputStock) {
                                        inputStock.disabled = !!e.target.value;
                                        if (e.target.value) inputStock.value = ''; // Limpiar visualmente
                                    }
                                }}
                            >
                                <option value="">-- Sin vincular (Stock propio) --</option>
                                {listaProductos.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre} (Stock: {p.stock})
                                    </option>
                                ))}
                            </select>
                            <small style={{fontSize:'0.7rem', color:'#666', marginTop:'2px'}}>
                                Si vinculas, se descontará del stock del producto elegido.
                            </small>
                        </div>
                    </div>

                    <div className="admin-form-group">
                        <label className="admin-form-label">📦 Stock Manual</label>
                        <input 
                            id="input-stock-acomp"
                            name="stock" 
                            type="number" 
                            defaultValue={editingItem?.stock || 0} 
                            disabled={!!editingItem?.producto_vinculado_id} // Deshabilitar si ya tiene vínculo
                        />
                    </div>
                  </>
                )}

                {/* CAJERAS */}
                {activeTab === 'cajeras' && (
                  <>
                    <div className="admin-form-group">
                      <label className="admin-form-label">Usuario</label>
                      <input name="usuario" required />
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-form-label">Contraseña</label>
                      <input name="password" type="password" required minLength="6" />
                    </div>
                  </>
                )}

                <div className="admin-modal-footer">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancelar</button>
                  <button type="submit" className="btn btn-primary">💾 Guardar</button>
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