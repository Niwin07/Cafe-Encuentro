import { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ListaPedidosActivos from './ListaPedidosActivos';
import ModalProducto from '../components/ModalProducto';
import { useLocation } from 'wouter';
import './MenuCajera.css'; // <--- IMPORTANTE

const MenuCajera = () => {
  const { user } = useContext(AuthContext);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [procesando, setProcesando] = useState(false);
  const [, setLocation] = useLocation();
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const res = await api.get('/productos/menu');
      setProductos(res.data.menu);
      const cats = [...new Set(res.data.menu.map(p => p.categoria.nombre))];
      setCategorias(['Todas', ...cats]);
    } catch (error) { console.error(error); }
  };

  const abrirModalProducto = (producto) => {
    if (producto.stock <= 0) return alert('⚠️ No hay stock');
    setProductoSeleccionado(producto);
  };

  const agregarAlCarrito = (itemConfigurado) => {
    const itemCart = {
      tempId: Date.now(),
      id: itemConfigurado.id,
      nombre: itemConfigurado.nombre,
      precio: itemConfigurado.precio,
      cantidad: itemConfigurado.cantidad,
      acompanamiento_id: itemConfigurado.acompanamiento_id,
      acompanamiento_nombre: itemConfigurado.acompanamiento_nombre,
      notas: itemConfigurado.instrucciones_especiales,
      destino_id: itemConfigurado.destino.id
    };
    setCarrito([...carrito, itemCart]);
  };

  const eliminarDelCarrito = (tempId) => {
    setCarrito(carrito.filter(item => item.tempId !== tempId));
  };

  const confirmarPedido = async () => {
    if (!cliente.trim()) return alert('⚠️ Falta nombre del cliente');
    if (carrito.length === 0) return alert('⚠️ Carrito vacío');
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
    } catch (error) { alert(error.message); } 
    finally { setProcesando(false); }
  };

  const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const productosFiltrados = categoriaSeleccionada === 'Todas' 
    ? productos 
    : productos.filter(p => p.categoria.nombre === categoriaSeleccionada);

  return (
    <div className="pos-layout">
      
      {/* 1. CATÁLOGO */}
      <section className="catalog-section">
        <div className="catalog-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ color: 'white', marginBottom: '5px' }}>Café Encuentro</h2>
              <small>Cajera: {user?.nombre}</small>
            </div>
            <button onClick={() => setLocation('/admin')} className="btn btn-icon btn-secondary">⚙️</button>
          </div>
          
          <div className="categories-scroll">
            {categorias.map(cat => (
              <button 
                key={cat} 
                onClick={() => setCategoriaSeleccionada(cat)}
                className={`cat-btn ${categoriaSeleccionada === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="products-grid">
          {productosFiltrados.map(prod => (
            <div key={prod.id} className="product-card" onClick={() => abrirModalProducto(prod)}>
              <div>
                <h4 style={{ fontSize: '1rem', marginBottom: '5px' }}>{prod.nombre}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: 0 }}>Stock: {prod.stock}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <span className="product-price">${prod.precio}</span>
                <span style={{ fontSize: '1.2rem' }}>➕</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. CARRITO */}
      <section className="cart-section">
        <div className="cart-header">
          <h3 style={{ marginBottom: '10px' }}>🛒 Pedido Actual</h3>
          <input 
            type="text" 
            placeholder="Cliente / Mesa..." 
            value={cliente} 
            onChange={e => setCliente(e.target.value)}
            autoFocus
          />
        </div>

        <div className="cart-items-container">
          {carrito.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '40px' }}>
              <p>El carrito está vacío</p>
              <span style={{ fontSize: '3rem' }}>☕</span>
            </div>
          ) : (
            carrito.map(item => (
              <div key={item.tempId} className="cart-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600' }}>
                    <span style={{ color: 'var(--primary)' }}>{item.cantidad}x</span> {item.nombre}
                  </div>
                  {item.acompanamiento_nombre && <small style={{ display: 'block', color: '#666' }}>+ {item.acompanamiento_nombre}</small>}
                  {item.notas && <small style={{ display: 'block', color: 'orange' }}>📝 {item.notas}</small>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold' }}>${item.precio * item.cantidad}</div>
                  <button 
                    onClick={() => eliminarDelCarrito(item.tempId)}
                    style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            <span>Total</span>
            <span>${total}</span>
          </div>
          <button 
            onClick={confirmarPedido} 
            disabled={procesando}
            className="btn btn-success" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
          >
            {procesando ? 'Enviando...' : 'CONFIRMAR PEDIDO'}
          </button>
        </div>
      </section>

      {/* 3. HISTORIAL */}
      <section className="history-section">
        <ListaPedidosActivos />
      </section>

      {productoSeleccionado && (
        <ModalProducto 
          producto={productoSeleccionado} 
          onClose={() => setProductoSeleccionado(null)} 
          onConfirm={agregarAlCarrito} 
        />
      )}
    </div>
  );
};

export default MenuCajera;