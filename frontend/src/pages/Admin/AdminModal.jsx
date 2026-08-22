import { useState, useMemo, memo } from 'react';
import api from '../../services/api';

/**
 * Modal de creación/edición extraído de AdminPanel.
 * Al vivir en su propio componente, los cambios de estado interno
 * (filtro de acompañamientos, nombre rápido, etc.) no re-renderizan
 * la tabla ni los tabs de AdminPanel.
 */
const AdminModal = memo(({
  activeTab,
  editingItem,
  auxCats,
  auxDest,
  auxAcomp,
  listaProductos,
  onClose,
  onSaved,
  onAuxAcompCreado,
  onEditingItemUpdate,
}) => {
  // Estado local: solo afecta a este componente al cambiar
  const [filtroAcomp, setFiltroAcomp]           = useState('');
  const [nuevoAcompNombre, setNuevoAcompNombre]  = useState('');
  const [nuevoAcompCategoria, setNuevoAcompCategoria] = useState('Bebida');
  const [creandoAcomp, setCreandoAcomp]          = useState(false);
  const [generandoImagen, setGenerandoImagen]    = useState(false);
  const [stockDeshabilitado, setStockDeshabilitado] = useState(
    !!editingItem?.producto_vinculado_id
  );

  const acompFiltrados = useMemo(() => {
    const lower = filtroAcomp.toLowerCase();
    return lower === ''
      ? auxAcomp
      : auxAcomp.filter(ac => ac.nombre.toLowerCase().includes(lower));
  }, [auxAcomp, filtroAcomp]);

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
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
      } else if (editingItem?.id) {
        await api.put(`/${activeTab}/${editingItem.id}`, payload);
      } else {
        await api.post(`/${activeTab}`, payload);
      }
      alert('✅ Guardado correctamente');
      onSaved();
    } catch (error) {
      alert('Error al guardar: ' + (error.response?.data?.mensaje || error.message));
    }
  };

  const handleQuickCreateAcomp = async (e) => {
    e.preventDefault();
    if (!nuevoAcompNombre.trim()) return;
    setCreandoAcomp(true);
    try {
      const res = await api.post('/acompanamientos', {
        nombre: nuevoAcompNombre,
        categoria: nuevoAcompCategoria,
        stock: 50,
      });
      const nuevoItem = {
        id: res.data.id,
        nombre: nuevoAcompNombre,
        categoria: nuevoAcompCategoria,
        stock: 50,
      };
      onAuxAcompCreado(nuevoItem);
      setNuevoAcompNombre('');
      alert('✨ Opción creada!');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setCreandoAcomp(false);
    }
  };

  const handleGenerarImagen = async () => {
    if (!editingItem?.id) return;
    setGenerandoImagen(true);
    try {
      const res = await api.post(`/productos/${editingItem.id}/generar-imagen`);
      const urlFresh = `${res.data.imagen_url}?v=${Date.now()}`;
      onEditingItemUpdate({ imagen_url: urlFresh });
    } catch (error) {
      alert('Error al generar la imagen: ' + (error.response?.data?.mensaje || error.message));
    } finally {
      setGenerandoImagen(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>{editingItem?.id ? 'Editar' : 'Crear'} {activeTab}</h3>
        </div>
        <div className="admin-modal-body">
          <form onSubmit={handleSave} className="admin-form">

            <div className="admin-form-group">
              <label className="admin-form-label">Nombre</label>
              <input name="nombre" defaultValue={editingItem?.nombre} required />
            </div>

            {/* ── PRODUCTOS ─────────────────────────────────────────────── */}
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
                      <small style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px', display: 'block' }}>
                        Se genera automáticamente a partir del nombre y la descripción.
                      </small>
                      <button
                        type="button"
                        onClick={handleGenerarImagen}
                        disabled={generandoImagen}
                        className="btn btn-sm btn-secondary"
                        style={{ marginTop: '0.5rem' }}
                      >
                        {generandoImagen
                          ? '✨ Generando...'
                          : editingItem?.imagen_url ? '🔄 Regenerar imagen' : '✨ Generar imagen'}
                      </button>
                    </>
                  ) : (
                    <small style={{ fontSize: '0.75rem', color: '#666' }}>
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

                <div className="admin-acomp-section">
                  <label className="admin-form-label">🥄 Opciones / Acompañamientos</label>
                  <input
                    placeholder="🔍 Buscar..."
                    value={filtroAcomp}
                    onChange={e => setFiltroAcomp(e.target.value)}
                    className="admin-acomp-search"
                  />
                  <div className="admin-acomp-grid">
                    {acompFiltrados.map(ac => {
                      const isChecked = editingItem?.acompanamientos?.some(a => a.id === ac.id);
                      return (
                        <label key={ac.id} className={`admin-acomp-checkbox ${isChecked ? 'checked' : ''}`}>
                          <input type="checkbox" name="acompanamientos" value={ac.id} defaultChecked={isChecked} />
                          {ac.nombre} <span className="admin-acomp-cat">({ac.stock})</span>
                        </label>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '1rem', borderTop: '1px dashed #ccc', paddingTop: '0.5rem' }}>
                    <small>¿No encuentras la opción? Créala rápido:</small>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input
                        placeholder="Nombre (ej: Hielo)"
                        value={nuevoAcompNombre}
                        onChange={e => setNuevoAcompNombre(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <select
                        value={nuevoAcompCategoria}
                        onChange={e => setNuevoAcompCategoria(e.target.value)}
                        style={{ width: '120px' }}
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

            {/* ── ACOMPAÑAMIENTOS ───────────────────────────────────────── */}
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

                  <div className="admin-form-group">
                    <label className="admin-form-label">🔗 Vincular Stock (Opcional)</label>
                    <select
                      name="producto_vinculado_id"
                      defaultValue={editingItem?.producto_vinculado_id || ''}
                      onChange={(e) => setStockDeshabilitado(!!e.target.value)}
                    >
                      <option value="">-- Sin vincular (Stock propio) --</option>
                      {listaProductos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} (Stock: {p.stock})
                        </option>
                      ))}
                    </select>
                    <small style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>
                      Si vinculas, se descontará del stock del producto elegido.
                    </small>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">📦 Stock Manual</label>
                  <input
                    name="stock"
                    type="number"
                    defaultValue={stockDeshabilitado ? '' : (editingItem?.stock || 0)}
                    disabled={stockDeshabilitado}
                  />
                </div>
              </>
            )}

            {/* ── CAJERAS ───────────────────────────────────────────────── */}
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
              <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
              <button type="submit" className="btn btn-primary">💾 Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

AdminModal.displayName = 'AdminModal';

export default AdminModal;
