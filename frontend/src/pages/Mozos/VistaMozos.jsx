import { useState, useEffect, useMemo } from 'react';
import { Search, Grid, List, X, Coffee, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import './VistaMozos.css';

const VistaMozos = () => {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [vistaGrid, setVistaGrid] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarInventario = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const res = await api.get('/productos');
      const prodsActivos = res.data.productos.filter(p => p.stock > 0);
      setProductos(prodsActivos);
    } catch (error) {
      console.error("Error cargando inventario:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarInventario();
    const interval = setInterval(() => cargarInventario(true), 120000);
    return () => clearInterval(interval);
  }, []);

  const busquedaLower = useMemo(() => busqueda.toLowerCase(), [busqueda]);

  // useMemo: el Set y los conteos solo se recalculan cuando cambia `productos`
  const categoriasConConteo = useMemo(() => {
    const cats = ['Todos', ...new Set(productos.map(p => p.categoria_nombre))];
    return cats.map(cat => ({
      nombre: cat,
      cantidad: cat === 'Todos' ? productos.length : productos.filter(p => p.categoria_nombre === cat).length
    }));
  }, [productos]);

  // useMemo: solo se recalcula cuando cambia busqueda o categoría, no en re-renders por polling
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchCategoria = categoriaSeleccionada === 'Todos' || p.categoria_nombre === categoriaSeleccionada;
      if (!matchCategoria) return false;
      if (busquedaLower === '') return true;
      return (
        p.nombre.toLowerCase().includes(busquedaLower) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(busquedaLower))
      );
    });
  }, [productos, categoriaSeleccionada, busquedaLower]);

  // Iconos mejorados por categoría
  const getCategoryIcon = (categoria) => {
    const icons = {
      'Bebidas': '🥤',
      'Cafés': '☕',
      'Café': '☕',
      'Comidas': '🍽️',
      'Desayunos': '🥐',
      'Postres': '🍰',
      'Dulces': '🧁',
      'Snacks': '🍿',
      'Ensaladas': '🥗',
      'Sandwiches': '🥪',
      'Sandwich': '🥪',
      'Pastas': '🍝',
      'Hamburguesas': '🍔',
      'Pizzas': '🍕',
      'Jugos': '🧃',
      'Todos': '🍴'
    };
    return icons[categoria] || '🍴';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="coffee-cup">
            <Coffee className="coffee-icon" size={100} />
          </div>
          <h2 className="loading-title">Preparando el menú</h2>
          <p className="loading-subtitle">Un momento por favor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-wrapper">
      
      {/* ===== HEADER SIMPLIFICADO ===== */}
      <header className="menu-header">
        <div className="container">
          <div className="header-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="brand">
                <div className="brand-icon">
                  <Coffee />
                </div>
                <div className="brand-text">
                  <h1 className="brand-title">Menú Digital</h1>
                  <p className="brand-subtitle">Café Encuentro</p>
                </div>
              </div>
              
              <div className="header-actions">
                <button 
                  onClick={() => cargarInventario(true)} 
                  className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
                  disabled={refreshing}
                  title="Actualizar"
                  aria-label="Actualizar menú"
                >
                  <RefreshCw size={20} />
                </button>
                
                <button
                  onClick={() => setVistaGrid(!vistaGrid)}
                  className="view-toggle-btn"
                  title={vistaGrid ? "Vista lista" : "Vista cuadrícula"}
                  aria-label={vistaGrid ? "Cambiar a vista lista" : "Cambiar a vista cuadrícula"}
                >
                  {vistaGrid ? <List size={20} /> : <Grid size={20} />}
                </button>
              </div>
            </div>

            {/* ===== BÚSQUEDA PROMINENTE ===== */}
            <div className="search-section">
              <div className="search-box">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="search-input"
                  aria-label="Buscar productos"
                />
                {busqueda && (
                  <button 
                    onClick={() => setBusqueda('')} 
                    className="clear-btn"
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== CATEGORÍAS STICKY - SIEMPRE VISIBLES ===== */}
        <div className="categories-section">
          <div className="container">
            <div className="categories-scroll">
              {categoriasConConteo.map(({ nombre, cantidad }) => (
                <button
                  key={nombre}
                  onClick={() => setCategoriaSeleccionada(nombre)}
                  className={`category-chip ${categoriaSeleccionada === nombre ? 'active' : ''}`}
                  aria-pressed={categoriaSeleccionada === nombre}
                >
                  <span className="category-icon">{getCategoryIcon(nombre)}</span>
                  <span>{nombre}</span>
                  <span className="category-count">{cantidad}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <main className="container menu-main">
        
        {/* Info bar con feedback */}
        <div className="info-bar">
          <p className="results-text">
            {productosFiltrados.length === 0 ? (
              'No se encontraron productos'
            ) : (
              <>
                Mostrando <strong>{productosFiltrados.length}</strong>{' '}
                {productosFiltrados.length === 1 ? 'producto' : 'productos'}
                {categoriaSeleccionada !== 'Todos' && (
                  <> en <span className="filter-active">{categoriaSeleccionada}</span></>
                )}
                {busqueda && (
                  <> para "<span className="filter-active">{busqueda}</span>"</>
                )}
              </>
            )}
          </p>
        </div>

        {/* Grid de productos o estado vacío */}
        {productosFiltrados.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔍</div>
            <h3 className="empty-title">
              {busqueda ? 'No encontramos resultados' : 'No hay productos'}
            </h3>
            <p className="empty-text">
              {busqueda 
                ? 'Intenta con otra búsqueda o explora otras categorías.'
                : 'No hay productos disponibles en esta categoría.'}
            </p>
            {(busqueda || categoriaSeleccionada !== 'Todos') && (
              <button 
                onClick={() => {
                  setBusqueda('');
                  setCategoriaSeleccionada('Todos');
                }}
                className="empty-btn"
              >
                Ver todo el menú
              </button>
            )}
          </div>
        ) : (
          <div className={`products ${vistaGrid ? 'grid' : 'list'}`}>
            {productosFiltrados.map((producto, idx) => (
              <article
                key={producto.id}
                className="product"
                style={{ '--index': idx }}
              >
                <div className="product-media">
                  {producto.imagen_url ? (
                    <img
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      className="product-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="product-icon">
                      {getCategoryIcon(producto.categoria_nombre)}
                    </div>
                  )}
                  {producto.stock < 10 && (
                    <div className="product-badge">
                      <span className="badge-dot"></span>
                      Quedan {producto.stock}
                    </div>
                  )}
                </div>

                <div className="product-body">
                  <div className="product-header">
                    <h3 className="product-title">{producto.nombre}</h3>
                    <span className="product-tag">{producto.categoria_nombre}</span>
                  </div>

                  {producto.descripcion && (
                    <p className="product-desc">{producto.descripcion}</p>
                  )}

                  <div className="product-footer">
                    <div className="product-price-box">
                      <span className="price-label">Precio</span>
                      <span className="product-price">
                        ${producto.precio.toLocaleString('es-AR')}
                      </span>
                    </div>
                    
                    {producto.stock > 10 ? (
                      <span className="product-stock stock-available">
                        ✓ Disponible
                      </span>
                    ) : (
                      <span className="product-stock stock-low">
                        ⚠ Stock: {producto.stock}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      
      {/* Espaciado inferior */}
      <div style={{ height: '3rem' }}></div>
    </div>
  );
};

export default VistaMozos;