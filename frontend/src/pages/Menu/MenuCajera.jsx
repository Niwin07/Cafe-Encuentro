import { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ListaPedidosActivos from './ListaPedidosActivos';
import ModalProducto from '../../components/ModalProducto';
import { useLocation } from 'wouter';
import {
  Coffee, BarChart3, Settings, LogOut, UtensilsCrossed, ShoppingCart,
  ClipboardList, Search, Plus, Trash2, CheckCircle2, Loader2, StickyNote,
} from 'lucide-react';
import './MenuCajera.css';

const MenuCajera = () => {
  const { user, logout } = useContext(AuthContext);
  const toast = useToast();
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
    if (producto.stock <= 0) return toast.warning('No hay stock disponible para este producto.');
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
  if (!cliente.trim()) return toast.warning('Ingresá el nombre del cliente o la mesa para continuar.');
  if (carrito.length === 0) return toast.warning('El carrito está vacío. Agregá al menos un producto.');

  // Validar que todos los items tengan acompañamiento si hay opciones disponibles
  const itemsSinAcompRequerido = [];

  for (const item of carrito) {
    // Buscar el producto original para ver si tiene acompañamientos disponibles
    const prodOriginal = productos.find(p => p.id === item.id);

    // Si el producto tiene acompañamientos disponibles y no se seleccionó ninguno
    if (prodOriginal?.acompanamientos?.length > 0 && !item.acompanamiento_id) {
      itemsSinAcompRequerido.push(item.nombre);
    }
  }

  if (itemsSinAcompRequerido.length > 0) {
    const productosLista = itemsSinAcompRequerido.join(', ');
    return toast.warning(`Estos productos requieren un acompañamiento:\n${productosLista}`);
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
    toast.success('Pedido confirmado correctamente.');
    setCarrito([]);
    setCliente('');
    cargarDatos();

    // Cambiar a pestaña de pedidos en móvil
    if (window.innerWidth < 1024) {
      setTabActiva('pedidos');
    }
  } catch (error) {
    toast.error(error.response?.data?.mensaje || error.message || 'No se pudo confirmar el pedido.');
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
            <h1 className="pos-header-title"><Coffee size={22} className="pos-header-icon" aria-hidden="true" /> Café Encuentro</h1>
            <p className="pos-header-user">
              Cajera: <strong>{user?.nombre}</strong>
            </p>
          </div>

          <div className="pos-header-actions">
            <button
              onClick={() => setLocation('/registros')}
              className="btn btn-icon"
              title="Registros"
              aria-label="Ver registros"
            >
              <BarChart3 size={22} strokeWidth={2.25} />
            </button>
            <button
              onClick={() => setLocation('/admin')}
              className="btn btn-icon"
              title="Administración"
              aria-label="Ir a administración"
            >
              <Settings size={22} strokeWidth={2.25} />
            </button>
            <button
              onClick={logout}
              className="btn btn-icon"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={22} strokeWidth={2.25} />
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
            <UtensilsCrossed size={16} />
            <span>Catálogo</span>
          </button>
          <button
            className={`pos-tab-btn ${tabActiva === 'carrito' ? 'active' : ''}`}
            onClick={() => setTabActiva('carrito')}
          >
            <ShoppingCart size={16} />
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
            <ClipboardList size={16} />
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
              <Search size={17} className="pos-buscador-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                aria-label="Buscar producto"
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
                role="button"
                tabIndex={prod.stock === 0 ? -1 : 0}
                aria-disabled={prod.stock === 0}
                aria-label={`${prod.nombre}, $${prod.precio}${prod.stock === 0 ? ', sin stock' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    abrirModalProducto(prod);
                  }
                }}
              >
                {/* Badge de stock bajo */}
                {prod.stock < 5 && prod.stock > 0 && (
                  <div className="badge badge-warning producto-badge-stock">
                    ¡Quedan {prod.stock}!
                  </div>
                )}
                
                {prod.imagen_url && (
                  <div className="producto-imagen">
                    <img src={prod.imagen_url} alt={prod.nombre} loading="lazy" />
                  </div>
                )}

                <div>
                  <h4 className="producto-nombre">{prod.nombre}</h4>
                  <p className="producto-stock">Stock: {prod.stock}</p>
                </div>
                
                <div className="producto-footer">
                  <span className="producto-precio">${prod.precio}</span>
                  {prod.stock > 0 && (
                    <Plus size={22} className="producto-icono-add" aria-hidden="true" />
                  )}
                </div>
              </div>
            ))}

            {productosFiltrados.length === 0 && (
              <div className="pos-productos-vacio">
                <Search size={40} className="pos-productos-vacio-icono" aria-hidden="true" />
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>
        </div>

        {/* CARRITO */}
        <div className={`pos-carrito ${tabActiva === 'carrito' ? 'active' : ''}`}>
          
          <div className="pos-carrito-header">
            <h3><ShoppingCart size={18} className="pos-header-icon" aria-hidden="true" /> Pedido Actual</h3>
            <label htmlFor="cliente-input" className="sr-only">Nombre del cliente o mesa</label>
            <input
              id="cliente-input"
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
                <ShoppingCart size={40} className="carrito-vacio-icono" aria-hidden="true" />
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
                      <div className="carrito-item-nota"><StickyNote size={12} aria-hidden="true" /> {item.notas}</div>
                    )}
                  </div>
                  
                  <div className="carrito-item-acciones">
                    <div className="carrito-item-precio">
                      ${(item.precio * item.cantidad).toFixed(2)}
                    </div>
                    <button
                      onClick={() => eliminarDelCarrito(item.tempId)}
                      className="btn-ghost carrito-item-quitar"
                      aria-label={`Quitar ${item.nombre} del carrito`}
                    >
                      <Trash2 size={14} /> Quitar
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
                  <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                  Procesando...
                </>
              ) : (
                <><CheckCircle2 size={18} aria-hidden="true" /> CONFIRMAR PEDIDO ({carrito.length})</>
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