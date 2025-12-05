import { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ListaPedidosActivos from './ListaPedidosActivos';
import ModalProducto from '../components/ModalProducto';
import { useLocation } from 'wouter';

const MenuCajera = () => {
  const { user } = useContext(AuthContext);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [procesando, setProcesando] = useState(false);
  const [, setLocation] = useLocation();
  
  // Estado para el Modal
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const res = await api.get('/productos/menu');
      setProductos(res.data.menu);
      const cats = [...new Set(res.data.menu.map(p => p.categoria.nombre))];
      setCategorias(['Todas', ...cats]);
    } catch (error) {
      alert('Error cargando menú: ' + error.message);
    }
  };

  // 1. Abrir Modal en lugar de agregar directo
  const abrirModalProducto = (producto) => {
    if (producto.stock <= 0) return alert('⚠️ No hay stock');
    setProductoSeleccionado(producto);
  };

  // 2. Agregar al Carrito (viene del Modal)
  const agregarAlCarrito = (itemConfigurado) => {
    const itemCart = {
      tempId: Date.now(), // ID temporal para el frontend
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
      cargarDatos(); // Recargar stock visualmente
    } catch (error) {
      alert('Error: ' + (error.response?.data?.mensaje || error.message));
    } finally {
      setProcesando(false);
    }
  };

  const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const productosFiltrados = categoriaSeleccionada === 'Todas' 
    ? productos 
    : productos.filter(p => p.categoria.nombre === categoriaSeleccionada);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr', gap: '20px', padding: '20px', height: '100vh', boxSizing: 'border-box' }}>
      
      {/* 1. CATÁLOGO */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white', borderRadius: '16px', border: '1px solid #e8d4b8' }}>
        
        {/* HEADER RESTAURADO */}
        <div style={{ padding: '20px', background: 'linear-gradient(135deg, #6f4e37, #8b5a3c)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.5em', fontFamily: 'Playfair Display, serif' }}>
              Hola, {user?.nombre || 'Cajera'} 👋
            </h2>
            
            <button 
              onClick={() => setLocation('/admin')}
              title="Administrar Inventario"
              style={{ 
                background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', 
                width: '40px', height: '40px', borderRadius: '50%', 
                cursor: 'pointer', fontSize: '1.2em', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              ⚙️
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '15px', paddingBottom: '5px' }}>
            {categorias.map(cat => (
              <button 
                key={cat} 
                onClick={() => setCategoriaSeleccionada(cat)}
                style={{ 
                  background: categoriaSeleccionada === cat ? 'white' : 'rgba(255,255,255,0.2)',
                  color: categoriaSeleccionada === cat ? '#6f4e37' : 'white',
                  border: 'none', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '15px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
          {productosFiltrados.map(prod => (
            <div 
              key={prod.id} 
              onClick={() => abrirModalProducto(prod)}
              style={{ 
                border: '1px solid #e8d4b8', borderRadius: '12px', padding: '12px', 
                cursor: 'pointer', background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                opacity: prod.stock > 0 ? 1 : 0.6, transition: 'transform 0.1s'
              }}
            >
              <h4 style={{ margin: '0 0 5px 0', fontSize: '1em' }}>{prod.nombre}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ fontWeight: 'bold', color: '#8b5a3c' }}>${prod.precio}</span>
                <span style={{ fontSize: '0.8em', color: prod.stock > 5 ? 'green' : 'red' }}>Stock: {prod.stock}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. CARRITO */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', background: '#fdfbf7', borderRadius: '16px', border: '1px solid #e8d4b8', padding: '20px' }}>
        <h2 style={{ fontSize: '1.2em', borderBottom: '2px solid #e8d4b8', paddingBottom: '10px' }}>🛒 Nuevo Pedido</h2>
        
        <input 
          type="text" placeholder="Nombre Cliente / Mesa" 
          value={cliente} onChange={e => setCliente(e.target.value)}
          style={{ marginBottom: '15px', padding: '12px' }}
        />

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px' }}>
          {carrito.length === 0 ? <p style={{ textAlign: 'center', color: '#aaa', marginTop: '50px' }}>Carrito vacío</p> : (
            carrito.map(item => (
              <div key={item.tempId} style={{ background: 'white', padding: '10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{item.nombre} <span style={{color: '#8b5a3c'}}>x{item.cantidad}</span></strong>
                  <span style={{ fontWeight: 'bold' }}>${item.precio * item.cantidad}</span>
                </div>
                {item.acompanamiento_nombre && <div style={{ fontSize: '0.85em', color: '#666' }}>+ {item.acompanamiento_nombre}</div>}
                {item.notas && <div style={{ fontSize: '0.85em', color: '#d35400', fontStyle: 'italic' }}>📝 {item.notas}</div>}
                <button onClick={() => eliminarDelCarrito(item.tempId)} style={{ fontSize: '0.8em', color: 'red', background: 'none', border: 'none', cursor: 'pointer', marginTop: '5px', padding: 0 }}>Eliminar</button>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 'auto', background: '#8b5a3c', color: 'white', padding: '15px', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', fontWeight: 'bold', marginBottom: '10px' }}>
            <span>Total:</span>
            <span>${total}</span>
          </div>
          <button 
            onClick={confirmarPedido} disabled={procesando}
            className="btn btn-success" style={{ width: '100%', fontSize: '1.1em' }}
          >
            {procesando ? 'Enviando...' : 'CONFIRMAR PEDIDO'}
          </button>
        </div>
      </div>

      {/* 3. HISTORIAL */}
      <div className="card" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8d4b8', overflow: 'hidden' }}>
        <ListaPedidosActivos />
      </div>

      {/* MODAL */}
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