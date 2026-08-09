import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLocation } from 'wouter';
import { useToast } from '../../context/ToastContext';
import {
  Settings, ArrowLeft, Package, Tag, Utensils, Target, Users, Plus,
  Pencil, Trash2, Image as ImageIcon, Sparkles, RefreshCw, Link2, Search, Save, Inbox,
} from 'lucide-react';
import './AdminPanel.css';

const AdminPanel = () => {
  const toast = useToast();
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
  const [generandoImagen, setGenerandoImagen] = useState(false);

  const [filtroAcomp, setFiltroAcomp] = useState('');

  useEffect(() => { cargarDatos(); }, [activeTab]);

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

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
      toast.error('Error cargando datos: ' + error.message);
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
      toast.success('Opción creada correctamente.');
    } catch (error) { toast.error('Error: ' + error.message); } finally { setCreandoAcomp(false); }
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
      toast.success('Guardado correctamente.');
      setShowModal(false);
      cargarDatos();
    } catch (error) {
      toast.error('Error al guardar: ' + (error.response?.data?.mensaje || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (activeTab === 'cajeras') { toast.warning('No se pueden eliminar cajeras desde aquí.'); return; }
    const ok = await toast.confirm('¿Seguro que querés eliminar este elemento? Esta acción no se puede deshacer.', {
      title: 'Eliminar elemento',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/${activeTab}/${id}`);
      toast.success('Elemento eliminado.');
      cargarDatos();
    } catch (error) { toast.error('Error al eliminar: ' + (error.response?.data?.mensaje || error.message)); }
  };

  const openModal = async (item = null) => {
    if (activeTab === 'cajeras' && item) { toast.warning('La edición de usuarios no está disponible.'); return; }
    
    // MODIFICADO: Cargamos auxiliares siempre que no sea cajeras, 
    // para tener las listas listas (incluyendo productos para vincular)
    if (activeTab !== 'cajeras') await cargarAuxiliares();
    
    setEditingItem(item || {});
    setShowModal(true);
    setFiltroAcomp('');
  };

  const handleGenerarImagen = async () => {
    if (!editingItem?.id) return;
    setGenerandoImagen(true);
    try {
      const res = await api.post(`/productos/${editingItem.id}/generar-imagen`);
      setEditingItem({ ...editingItem, imagen_url: res.data.imagen_url });
    } catch (error) {
      toast.error('Error al generar la imagen: ' + (error.response?.data?.mensaje || error.message));
    } finally {
      setGenerandoImagen(false);
    }
  };

  const tabs = [
    { id: 'productos', label: 'Productos', icon: Package },
    { id: 'categorias', label: 'Categorías', icon: Tag },
    { id: 'acompanamientos', label: 'Acompañamientos', icon: Utensils },
    { id: 'destinos', label: 'Destinos', icon: Target },
    { id: 'cajeras', label: 'Cajeras', icon: Users },
  ];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1><Settings size={22} aria-hidden="true" /> Panel de Administración</h1>
          <button onClick={() => setLocation('/pedidos')} className="btn admin-btn-volver">
            <ArrowLeft size={16} aria-hidden="true" /> Volver a Caja
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}>
            <tab.icon size={16} aria-hidden="true" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        <div className="admin-content-header">
          <h3>Gestionar {activeTab}</h3>
          <button onClick={() => openModal()} className="btn btn-success">
            <Plus size={16} aria-hidden="true" /> Nuevo
          </button>
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
                    <td data-label="Información">
                      <div className="admin-item-row">
                        {activeTab === 'productos' && (
                          item.imagen_url
                            ? <img src={item.imagen_url} alt={item.nombre} className="admin-item-thumb" />
                            : <div className="admin-item-thumb admin-item-thumb-vacio" aria-hidden="true"><ImageIcon size={18} /></div>
                        )}
                        <div>
                          <div className="admin-item-nombre">
                            {item.nombre}
                            {/* Mostrar indicador si está vinculado */}
                            {item.producto_vinculado_id && (
                                <span className="admin-item-vinculado">
                                    <Link2 size={11} aria-hidden="true" /> Vinculado
                                </span>
                            )}
                          </div>
                          {item.descripcion && <div className="admin-item-desc">{item.descripcion}</div>}
                        </div>
                      </div>
                    </td>
                    
                    {activeTab === 'productos' && (
                      <>
                        <td data-label="Precio / Stock">
                          <div className="admin-precio-stock">
                            <span className="admin-precio">${item.precio}</span>
                            <span className={`admin-stock ${item.stock < 5 ? 'bajo' : 'ok'}`}>Stock: {item.stock}</span>
                          </div>
                        </td>
                        <td data-label="Categoría">{item.categoria_nombre}</td>
                      </>
                    )}

                    {activeTab === 'acompanamientos' && (
                      <>
                        <td data-label="Categoría">{item.categoria}</td>
                        <td data-label="Stock">
                           <span className={`admin-stock ${item.stock < 10 ? 'bajo' : 'ok'}`}>
                              {item.stock} u.
                           </span>
                        </td>
                      </>
                    )}

                    {activeTab === 'cajeras' && <td data-label="Usuario" style={{ color: 'var(--text-muted)' }}>@{item.usuario}</td>}

                    <td data-label="Acciones">
                      <div className="admin-actions">
                        {activeTab !== 'cajeras' && (
                          <button onClick={() => openModal(item)} className="btn admin-btn-editar">
                            <Pencil size={14} aria-hidden="true" /> Editar
                          </button>
                        )}
                        {activeTab !== 'cajeras' && (
                          <button onClick={() => handleDelete(item.id)} className="btn btn-danger admin-btn-eliminar" aria-label={`Eliminar ${item.nombre}`}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-tabla-vacio">
                      <Inbox size={32} className="admin-tabla-vacio-icon" aria-hidden="true" />
                      No hay elementos todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-modal-titulo"
          >
            <div className="admin-modal-header">
              <h3 id="admin-modal-titulo">{editingItem.id ? 'Editar' : 'Crear'} {activeTab}</h3>
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
                        <label className="admin-form-label">
                          <ImageIcon size={15} aria-hidden="true" /> Imagen del producto (generada con IA)
                        </label>

                        {editingItem?.id ? (
                          <>
                            {editingItem?.imagen_url && (
                              <img src={editingItem.imagen_url} alt={`Vista previa de ${editingItem?.nombre || 'producto'}`} className="admin-imagen-preview" />
                            )}
                            <small className="admin-form-help">
                                Se genera automáticamente a partir del nombre y la descripción.
                            </small>
                            <button
                                type="button"
                                onClick={handleGenerarImagen}
                                disabled={generandoImagen}
                                className="btn btn-sm btn-secondary"
                                style={{marginTop: '0.5rem'}}
                            >
                                {generandoImagen ? (
                                  <><RefreshCw size={14} className="animate-spin" aria-hidden="true" /> Generando...</>
                                ) : editingItem?.imagen_url ? (
                                  <><RefreshCw size={14} aria-hidden="true" /> Regenerar imagen</>
                                ) : (
                                  <><Sparkles size={14} aria-hidden="true" /> Generar imagen</>
                                )}
                            </button>
                          </>
                        ) : (
                          <small className="admin-form-help">
                              Guardá el producto primero; después podés generarle una imagen desde "Editar".
                          </small>
                        )}
                    </div>

                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-form-label">Precio</label>
                        <input name="precio" type="number" step="0.01" defaultValue={editingItem?.precio} required />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-form-label">Stock</label>
                        <input name="stock" type="number" defaultValue={editingItem?.stock} required />
                      </div>
                    </div>
                    <div className="admin-form-row">
                      <div className="admin-form-group">
                        <label className="admin-form-label">Categoría</label>
                        <select name="categoria_id" defaultValue={editingItem?.categoria_id} required>
                          <option value="">-- Seleccionar --</option>
                          {auxCats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-form-label">Destino</label>
                        <select name="destino_id" defaultValue={editingItem?.destino_id} required>
                          <option value="">-- Seleccionar --</option>
                          {auxDest.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* SECCIÓN OPCIONES (Solo creación rápida, la vinculación es para la otra pestaña) */}
                    <div className="admin-acomp-section">
                      <label className="admin-form-label">
                        <Utensils size={15} aria-hidden="true" /> Opciones / Acompañamientos
                      </label>
                      <div className="admin-acomp-search-wrap">
                        <Search size={15} className="admin-acomp-search-icon" aria-hidden="true" />
                        <input placeholder="Buscar..." value={filtroAcomp} onChange={e => setFiltroAcomp(e.target.value)} className="admin-acomp-search" aria-label="Buscar acompañamiento" />
                      </div>
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
                            <label className="admin-form-label">
                              <Link2 size={15} aria-hidden="true" /> Vincular Stock (Opcional)
                            </label>
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
                            <small className="admin-form-help">
                                Si vinculas, se descontará del stock del producto elegido.
                            </small>
                        </div>
                    </div>

                    <div className="admin-form-group">
                        <label className="admin-form-label">
                          <Package size={15} aria-hidden="true" /> Stock Manual
                        </label>
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
                  <button type="submit" className="btn btn-primary"><Save size={16} aria-hidden="true" /> Guardar</button>
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