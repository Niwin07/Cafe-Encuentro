import { useState, useEffect } from 'react';
import api from '../services/api';
import { useLocation } from 'wouter';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('productos');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Estados para Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Datos auxiliares
  const [auxCats, setAuxCats] = useState([]);
  const [auxDest, setAuxDest] = useState([]);
  const [auxAcomp, setAuxAcomp] = useState([]);

  // Estado para "Creación Rápida" de acompañamiento
  const [nuevoAcompNombre, setNuevoAcompNombre] = useState('');
  const [nuevoAcompCategoria, setNuevoAcompCategoria] = useState('Bebida');
  const [creandoAcomp, setCreandoAcomp] = useState(false);

  // Filtro de búsqueda en la lista de acompañamientos
  const [filtroAcomp, setFiltroAcomp] = useState('');

  useEffect(() => {
    cargarDatos();
  }, [activeTab]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      let url = '';
      if (activeTab === 'productos') url = '/productos'; // Traer todos (activos e inactivos)
      else url = `/${activeTab}`;
      
      const res = await api.get(url);
      
      if (activeTab === 'productos') setData(res.data.productos || []);
      else setData(res.data || []);

    } catch (error) {
      console.error(error);
      alert('Error cargando datos');
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

  // Función para crear acompañamiento "al vuelo"
  const handleQuickCreateAcomp = async (e) => {
    e.preventDefault();
    if (!nuevoAcompNombre.trim()) return;

    setCreandoAcomp(true);
    try {
      // 1. Crear en BD
      const res = await api.post('/acompanamientos', {
        nombre: nuevoAcompNombre,
        categoria: nuevoAcompCategoria
      });

      // 2. Agregarlo a la lista local (auxAcomp) para que aparezca ya seleccionado
      const nuevoItem = { id: res.data.id, nombre: nuevoAcompNombre, categoria: nuevoAcompCategoria };
      setAuxAcomp([...auxAcomp, nuevoItem]);

      // 3. Marcarlo como seleccionado en el producto actual
      // (Truco: modificamos el editingItem para que React renderice el checkbox marcado)
      if (editingItem) {
        const actuales = editingItem.acompanamientos || [];
        setEditingItem({
          ...editingItem,
          acompanamientos: [...actuales, nuevoItem]
        });
      } else {
        // Si estamos creando un producto nuevo, necesitamos inicializar el array
        setEditingItem({
          acompanamientos: [nuevoItem]
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
    const acompIds = []; // Array separado para los IDs

    // Procesar FormData manualmente para capturar los checkboxes múltiples
    // (FormData.entries() devuelve pares clave/valor, si hay varios con misma clave, aparecen varias veces)
    for (const [key, value] of formData.entries()) {
        if (key === 'acompanamientos') {
            acompIds.push(parseInt(value));
        } else {
            payload[key] = value;
        }
    }
    
    // Agregar el array de IDs al payload final
    payload.acompanamientos_ids = acompIds;

    try {
      if (editingItem && editingItem.id) {
        await api.put(`/${activeTab}/${editingItem.id}`, payload);
      } else {
        await api.post(`/${activeTab}`, payload);
      }
      alert('✅ Guardado correctamente');
      setShowModal(false);
      cargarDatos();
    } catch (error) {
      alert('Error al guardar: ' + (error.response?.data?.mensaje || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro de eliminar este elemento?')) return;
    try {
      await api.delete(`/${activeTab}/${id}`);
      cargarDatos();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const openModal = async (item = null) => {
    if (activeTab === 'productos') await cargarAuxiliares();
    setEditingItem(item || {}); // Inicializar vacío si es nuevo
    setShowModal(true);
    setFiltroAcomp(''); // Resetear filtro
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4e9d8' }}>
      {/* HEADER */}
      <div style={{ background: '#3e2723', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: 'white' }}>⚙️ Administración</h2>
        <button onClick={() => setLocation('/pedidos')} className="btn" style={{ background: 'rgba(255,255,255,0.2)' }}>⬅️ Volver a Caja</button>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #ccc', padding: '0 20px', gap: '10px' }}>
        {['productos', 'categorias', 'acompanamientos', 'destinos'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: '15px 20px', border: 'none', background: 'none', 
              borderBottom: activeTab === tab ? '3px solid #8b5a3c' : '3px solid transparent',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              cursor: 'pointer', textTransform: 'capitalize',
              color: activeTab === tab ? '#8b5a3c' : '#666'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* LISTADO */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3>Gestionar {activeTab}</h3>
          <button onClick={() => openModal()} className="btn btn-success">➕ Nuevo {activeTab.slice(0,-1)}</button>
        </div>

        {loading ? <p>Cargando...</p> : (
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th>
                  {activeTab === 'productos' && <th style={{ padding: '12px', textAlign: 'left' }}>Info</th>}
                  {activeTab === 'productos' && <th style={{ padding: '12px', textAlign: 'left' }}>Categoría</th>}
                  <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{item.nombre}</strong>
                      {item.descripcion && <div style={{ fontSize: '0.8em', color: '#666' }}>{item.descripcion}</div>}
                    </td>
                    
                    {activeTab === 'productos' && (
                      <>
                        <td style={{ padding: '12px' }}>
                          ${item.precio} <br/> 
                          <span style={{ fontSize: '0.8em', color: item.stock < 5 ? 'red' : 'green' }}>Stock: {item.stock}</span>
                        </td>
                        <td style={{ padding: '12px' }}>{item.categoria_nombre}</td>
                      </>
                    )}

                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button onClick={() => openModal(item)} className="btn" style={{ background: '#ffbb33', marginRight: '5px', padding: '5px 10px' }}>✏️</button>
                      <button onClick={() => handleDelete(item.id)} className="btn btn-danger" style={{ padding: '5px 10px' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL FORMULARIO */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '95%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{marginTop:0}}>{editingItem.id ? 'Editar' : 'Crear'} {activeTab.slice(0, -1)}</h3>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div>
                <label style={{fontWeight:'bold'}}>Nombre</label>
                <input name="nombre" defaultValue={editingItem?.nombre} required />
              </div>

              {activeTab !== 'acompanamientos' && (
                <div>
                  <label>Descripción / Ingredientes</label>
                  <textarea name="descripcion" defaultValue={editingItem?.descripcion} rows="2" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
              )}

              {/* === FORMULARIO DE PRODUCTOS === */}
              {activeTab === 'productos' && (
                <>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label>Precio ($)</label>
                      <input name="precio" type="number" step="0.01" defaultValue={editingItem?.precio} required />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Stock</label>
                      <input name="stock" type="number" defaultValue={editingItem?.stock} required />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label>Categoría</label>
                      <select name="categoria_id" defaultValue={editingItem?.categoria_id} required>
                        <option value="">-- Seleccionar --</option>
                        {auxCats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Destino</label>
                      <select name="destino_id" defaultValue={editingItem?.destino_id} required>
                        <option value="">-- Seleccionar --</option>
                        {auxDest.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* SECCIÓN DE ACOMPAÑAMIENTOS MEJORADA */}
                  <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', color: '#8b5a3c' }}>
                      🥄 Opciones / Acompañamientos
                    </label>

                    {/* CREACIÓN RÁPIDA */}
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', padding: '10px', background: '#fff', borderRadius: '6px', border: '1px dashed #ccc' }}>
                      <input 
                        placeholder="Nueva opción (ej: Leche Almendras)" 
                        value={nuevoAcompNombre}
                        onChange={e => setNuevoAcompNombre(e.target.value)}
                        style={{ flex: 2, fontSize:'0.9em', padding:'8px' }}
                      />
                      <select 
                        value={nuevoAcompCategoria}
                        onChange={e => setNuevoAcompCategoria(e.target.value)}
                        style={{ flex: 1, fontSize:'0.9em', padding:'8px' }}
                      >
                        <option value="Bebida">Bebida</option>
                        <option value="Comida">Comida</option>
                        <option value="Extra">Extra</option>
                        <option value="Endulzante">Endulzante</option>
                      </select>
                      <button type="button" onClick={handleQuickCreateAcomp} disabled={creandoAcomp} className="btn" style={{ background: '#4caf50', fontSize:'0.8em' }}>
                        {creandoAcomp ? '...' : 'Crear & Asignar'}
                      </button>
                    </div>

                    {/* BUSCADOR DE OPCIONES */}
                    <input 
                      placeholder="🔍 Buscar opción existente..." 
                      value={filtroAcomp}
                      onChange={e => setFiltroAcomp(e.target.value)}
                      style={{ marginBottom: '10px', padding: '8px', fontSize: '0.9em' }}
                    />

                    {/* LISTA DE CHECKBOXES */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                      {auxAcomp
                        .filter(ac => ac.nombre.toLowerCase().includes(filtroAcomp.toLowerCase()))
                        .map(ac => {
                          // Chequeo inteligente: ¿Está en el producto original? O ¿Lo acabamos de crear en el formulario?
                          const isChecked = editingItem?.acompanamientos?.some(a => a.id === ac.id);
                          
                          return (
                            <label key={ac.id} style={{ fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: isChecked ? '#e8f5e9' : 'transparent', padding: '4px', borderRadius: '4px' }}>
                              <input 
                                type="checkbox" 
                                name="acompanamientos" 
                                value={ac.id} 
                                defaultChecked={isChecked} 
                              />
                              {ac.nombre} <span style={{fontSize:'0.8em', color:'#999'}}>({ac.categoria})</span>
                            </label>
                          )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* CAMPOS ESPECÍFICOS DE CATEGORÍAS/ACOMPAÑAMIENTOS/DESTINOS */}
              {activeTab === 'acompanamientos' && (
                <div>
                  <label>Tipo (Categoría)</label>
                  <select name="categoria" defaultValue={editingItem?.categoria} required>
                    <option value="Bebida">Bebida</option>
                    <option value="Comida">Comida</option>
                    <option value="Extra">Extra</option>
                    <option value="Endulzante">Endulzante</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop:'1px solid #eee', paddingTop:'20px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ flex: 1, background: '#e0e0e0', color: '#333' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;