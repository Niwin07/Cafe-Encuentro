import { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import ListaPedidosActivos from './ListaPedidosActivos';
import ModalProducto from '../../components/ModalProducto';
import { useLocation } from 'wouter';
import './MenuCajera.css';

const MenuCajera = () => {
  const { user, logout } = useContext(AuthContext);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [procesando, setProcesando] = useState(false);
  const [, setLocation] = useLocation();
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [tabActiva, setTabActiva] = useState('catalogo'); // Para móviles

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const res = await api.get('/productos/menu');
      setProductos(res.data.menu);
      const cats = [...new Set(res.data.menu.map(p => p.categoria.nombre))];
      setCategorias(['Todas', ...cats]);
    } catch (error) { 
      console.error(error); 
    }
  };

  const abrirModalProducto = (producto) => {
    if (producto.stock <= 0) return alert('⚠️ No hay stock');
    setProductoSeleccionado(producto);
  };

  const agregarAlCarrito = (itemConfigurado) => {
    // Buscamos si el acompañamiento seleccionado tiene un producto vinculado
    let prodVinculadoId = null;
    if (itemConfigurado.acompanamiento_id) {
        // Buscamos en el array de acompañamientos del producto original
        // (Nota: itemConfigurado es una copia, pero viene de productoSeleccionado)
        const acompOriginal = itemConfigurado.acompanamientos?.find(
            a => a.id.toString() === itemConfigurado.acompanamiento_id.toString()
        );
        if (acompOriginal) {
            prodVinculadoId = acompOriginal.producto_vinculado_id;
        }
    }

    const itemCart = {
      tempId: Date.now(),
      id: itemConfigurado.id,
      nombre: itemConfigurado.nombre,
      precio: itemConfigurado.precio,
      cantidad: itemConfigurado.cantidad,
      acompanamiento_id: itemConfigurado.acompanamiento_id,
      acompanamiento_nombre: itemConfigurado.acompanamiento_nombre,
      // GUARDAMOS ESTO PARA EL CÁLCULO DE STOCK LOCAL
      acompanamiento_vinculado_id: prodVinculadoId, 
      notas: itemConfigurado.instrucciones_especiales,
      destino_id: itemConfigurado.destino.id
    };
    
    setCarrito([...carrito, itemCart]);
    if (window.innerWidth < 1024) setTabActiva('carrito');
  };

  const eliminarDelCarrito = (tempId) => {
    setCarrito(carrito.filter(item => item.tempId !== tempId));
  };

    const confirmarPedido = async () => {
    if (!cliente.trim()) return alert('⚠️ Falta nombre del cliente');
    if (carrito.length === 0) return alert('⚠️ Carrito vacío');
    
    // Validar que todos los items tengan acompañamiento si es requerido
    const itemsSinAcomp = carrito.filter(item => 
      item.acompanamiento_id === null || item.acompanamiento_id === undefined
    );
    
    if (itemsSinAcomp.length > 0) {
      const productossinAcomp = itemsSinAcomp.map(i => i.nombre).join(', ');
      return alert(`⚠️ Los siguientes productos requieren acompañamiento: ${productossinAcomp}`);
    }
    
    setProcesando(true);
    try {
      const payload = {
        cliente: cliente,
        items: carrito.map(item => ({
          producto_id: item.id,
          cantidad: item.cantidad,
          acompanamiento_id: item.acompanamiento_id,
          instrucciones_especiales: item.notas
        }))
      };
      await api.post('/pedidos', payload);
      alert('✅ Pedido confirmado');
      setCarrito([]);
      setCliente('');
      cargarDatos();
      
      // Cambiar a pestaña de pedidos en móvil
      if (window.innerWidth < 1024) {
        setTabActiva('pedidos');
      }
    } catch (error) { 
      alert(error.message); 
    } finally { 
      setProcesando(false); 
    }
  };

  const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  
  const productosFiltrados = productos.filter(p => {
    const matchCategoria = categoriaSeleccionada === 'Todas' || p.categoria.nombre === categoriaSeleccionada;
    const matchBusqueda = busqueda === '' || 
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    return matchCategoria && matchBusqueda;
  });

  return (
    <div className="pos-container">
      
      {/* HEADER */}
      <div className="pos-header">
        <div className="pos-header-content">
          <div>
            <h2>☕ Café Encuentro</h2>
            <p className="pos-header-user">
              Cajera: <strong>{user?.nombre}</strong>
            </p>
          </div>
          
          <div className="pos-header-actions">
            <button 
              onClick={() => setLocation('/registros')} 
              className="btn btn-icon"
              title="Registros"
            >
              📊
            </button>
            <button 
              onClick={() => setLocation('/admin')} 
              className="btn btn-icon"
              title="Administración"
            >
              ⚙️
            </button>
            <button 
              onClick={logout} 
              className="btn btn-icon"
              title="Cerrar sesión"
            >
              🚪
            </button>
          </div>
        </div>
      </div>

      {/* TABS MÓVILES */}
      <div className="pos-tabs-mobile">
        <div className="pos-tabs-container">
          <button 
            className={`pos-tab-btn ${tabActiva === 'catalogo' ? 'active' : ''}`}
            onClick={() => setTabActiva('catalogo')}
          >
            <span>🍽️</span>
            <span>Catálogo</span>
          </button>
          <button 
            className={`pos-tab-btn ${tabActiva === 'carrito' ? 'active' : ''}`}
            onClick={() => setTabActiva('carrito')}
          >
            <span>🛒</span>
            <span>Carrito</span>
            {carrito.length > 0 && (
              <span className="badge badge-error" style={{ marginLeft: '0.25rem' }}>
                {carrito.length}
              </span>
            )}
          </button>
          <button 
            className={`pos-tab-btn ${tabActiva === 'pedidos' ? 'active' : ''}`}
            onClick={() => setTabActiva('pedidos')}
          >
            <span>📋</span>
            <span>Activos</span>
          </button>
        </div>
      </div>

      {/* LAYOUT PRINCIPAL */}
      <div className="pos-layout">
        
        {/* CATÁLOGO */}
        <div className={`pos-catalogo ${tabActiva === 'catalogo' ? 'active' : ''}`}>
          
          <div className="pos-catalogo-filtros">
            {/* Buscador */}
            <div className="pos-buscador">
              <input 
                type="text"
                placeholder="🔍 Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {/* Categorías */}
            <div className="pos-categorias">
              {categorias.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setCategoriaSeleccionada(cat)}
                  className={categoriaSeleccionada === cat ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Productos */}
          <div className="pos-productos-grid">
            {productosFiltrados.map(prod => (
              <div 
                key={prod.id} 
                className={`card producto-card ${prod.stock === 0 ? 'sin-stock' : ''}`}
                onClick={() => abrirModalProducto(prod)}
              >
                {/* Badge de stock bajo */}
                {prod.stock < 5 && prod.stock > 0 && (
                  <div className="badge badge-warning producto-badge-stock">
                    ¡Quedan {prod.stock}!
                  </div>
                )}
                
                <div>
                  <h4 className="producto-nombre">{prod.nombre}</h4>
                  <p className="producto-stock">Stock: {prod.stock}</p>
                </div>
                
                <div className="producto-footer">
                  <span className="producto-precio">${prod.precio}</span>
                  {prod.stock > 0 && (
                    <span className="producto-icono-add">➕</span>
                  )}
                </div>
              </div>
            ))}
            
            {productosFiltrados.length === 0 && (
              <div className="pos-productos-vacio">
                <p className="pos-productos-vacio-icono">🔍</p>
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>
        </div>

        {/* CARRITO */}
        <div className={`pos-carrito ${tabActiva === 'carrito' ? 'active' : ''}`}>
          
          <div className="pos-carrito-header">
            <h3>🛒 Pedido Actual</h3>
            <input 
              type="text" 
              placeholder="Nombre del cliente o mesa..."
              value={cliente} 
              onChange={e => setCliente(e.target.value)}
              autoFocus={tabActiva === 'carrito'}
            />
          </div>

          <div className="pos-carrito-items">
            {carrito.length === 0 ? (
              <div className="carrito-vacio">
                <p className="carrito-vacio-icono">🛒</p>
                <p>El carrito está vacío</p>
                <small>Selecciona productos del catálogo</small>
              </div>
            ) : (
              carrito.map(item => (
                <div key={item.tempId} className="carrito-item animate-fade-in">
                  <div className="carrito-item-info">
                    <div className="carrito-item-nombre">
                      <span className="carrito-item-cantidad">{item.cantidad}×</span> {item.nombre}
                    </div>
                    {item.acompanamiento_nombre && (
                      <div className="carrito-item-acomp">+ {item.acompanamiento_nombre}</div>
                    )}
                    {item.notas && (
                      <div className="carrito-item-nota">📝 {item.notas}</div>
                    )}
                  </div>
                  
                  <div className="carrito-item-acciones">
                    <div className="carrito-item-precio">
                      ${(item.precio * item.cantidad).toFixed(2)}
                    </div>
                    <button 
                      onClick={() => eliminarDelCarrito(item.tempId)}
                      className="btn-ghost"
                      style={{ 
                        color: 'var(--error)',
                        fontSize: '0.8125rem',
                        padding: '0.25rem 0.5rem'
                      }}
                    >
                      🗑️ Quitar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pos-carrito-footer">
            <div className="carrito-total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            
            <button 
              onClick={confirmarPedido}
              disabled={procesando || carrito.length === 0}
              className="btn btn-lg carrito-btn-confirmar"
            >
              {procesando ? (
                <>
                  <svg className="animate-spin" style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                <>✅ CONFIRMAR PEDIDO ({carrito.length})</>
              )}
            </button>
          </div>
        </div>

        {/* PEDIDOS ACTIVOS */}
        <div className={`pos-pedidos ${tabActiva === 'pedidos' ? 'active' : ''}`}>
          <ListaPedidosActivos />
        </div>
      </div>

      {/* MODAL PRODUCTO */}
      {productoSeleccionado && (
        <ModalProducto 
          producto={productoSeleccionado} 
          carrito={carrito} // <--- AGREGAR ESTA PROP
          onClose={() => setProductoSeleccionado(null)} 
          onConfirm={agregarAlCarrito} 
        />
      )}
    </div>
  );
};

export default MenuCajera;