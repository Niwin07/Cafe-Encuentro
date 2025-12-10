import { useState, useEffect } from 'react';
import { Search, Grid, List, Filter, X, Coffee, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import './VistaMozos.css';

const VistaMozos = () => {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [vistaGrid, setVistaGrid] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
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

  const categorias = ['Todos', ...new Set(productos.map(p => p.categoria_nombre))];

  const productosFiltrados = productos.filter(p => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    const matchCategoria = categoriaSeleccionada === 'Todos' || p.categoria_nombre === categoriaSeleccionada;
    return matchBusqueda && matchCategoria;
  });

  const getCategoryIcon = (categoria) => {
    const icons = {
      'Bebidas': '🥤', 'Cafés': '☕', 'Comidas': '🍽️',
      'Desayunos': '🥐', 'Postres': '🍰', 'Dulces': '🧁',
      'Snacks': '🍿', 'Ensaladas': '🥗', 'Sandwiches': '🥪',
      'Pastas': '🍝'
    };
    return icons[categoria] || '🍴';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="coffee-cup">
            <Coffee className="coffee-icon" />
            <div className="steam steam-1"></div>
            <div className="steam steam-2"></div>
            <div className="steam steam-3"></div>
          </div>
          <h2 className="loading-title">Preparando el menú</h2>
          <p className="loading-subtitle">Un momento por favor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-wrapper">
      {/* Header optimizado */}
      <header className="menu-header">
        <div className="container">
          <div className="header-top">
            <div className="brand">
              <div className="brand-icon">
                <Coffee />
              </div>
              <div className="brand-text">
                <h1 className="brand-title">Nuestro Menú</h1>
                <p className="brand-subtitle">Delicias artesanales</p>
              </div>
            </div>
            
            <div className="header-actions">
              <button 
                onClick={() => cargarInventario(true)} 
                className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
                disabled={refreshing}
                title="Actualizar menú"
              >
                <RefreshCw size={20} />
              </button>
              
              <div className="view-toggle">
                <button
                  onClick={() => setVistaGrid(true)}
                  className={`toggle-btn ${vistaGrid ? 'active' : ''}`}
                  aria-label="Vista en grilla"
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setVistaGrid(false)}
                  className={`toggle-btn ${!vistaGrid ? 'active' : ''}`}
                  aria-label="Vista en lista"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="search-wrapper">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Buscar platos..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="search-input"
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="clear-btn">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="filter-toggle"
          >
            <Filter size={18} />
            <span>Categorías</span>
            <span className="filter-count">{categorias.length - 1}</span>
          </button>
        </div>
      </header>

      <main className="menu-main">
        <div className="container">
          {/* Categorías mejoradas */}
          <div className={`categories ${mostrarFiltros ? 'show' : ''}`}>
            <div className="categories-inner">
              {categorias.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoriaSeleccionada(cat);
                    setMostrarFiltros(false);
                  }}
                  className={`category ${categoriaSeleccionada === cat ? 'active' : ''}`}
                >
                  <span className="category-text">{cat}</span>
                  {categoriaSeleccionada === cat && <span className="category-check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Info bar */}
          <div className="info-bar">
            <p className="results-text">
              <strong>{productosFiltrados.length}</strong> {productosFiltrados.length === 1 ? 'plato disponible' : 'platos disponibles'}
              {categoriaSeleccionada !== 'Todos' && <span className="filter-active"> en {categoriaSeleccionada}</span>}
            </p>
          </div>

          {/* Grid de productos ultra optimizado */}
          {productosFiltrados.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <h3 className="empty-title">No hay resultados</h3>
              <p className="empty-text">
                {busqueda ? `No encontramos "${busqueda}"` : 'No hay productos en esta categoría'}
              </p>
              <button 
                onClick={() => {
                  setBusqueda('');
                  setCategoriaSeleccionada('Todos');
                }}
                className="empty-btn"
              >
                Ver todo el menú
              </button>
            </div>
          ) : (
            <div className={`products ${vistaGrid ? 'grid' : 'list'}`}>
              {productosFiltrados.map((producto, idx) => (
                <article
                  key={producto.id}
                  className="product"
                  style={{ '--delay': `${idx * 30}ms` }}
                >
                  <div className="product-media">
                    <div className="product-icon">
                      {getCategoryIcon(producto.categoria_nombre)}
                    </div>
                    {producto.stock < 5 && (
                      <div className="product-badge badge-warning">
                        <span className="badge-dot"></span>
                        Últimas unidades
                      </div>
                    )}
                  </div>

                  <div className="product-body">
                    <div className="product-info">
                      <h3 className="product-title">{producto.nombre}</h3>
                      <span className="product-tag">{producto.categoria_nombre}</span>
                    </div>

                    {producto.descripcion && (
                      <p className="product-desc">{producto.descripcion}</p>
                    )}

                    <div className="product-meta">
                      <span className="product-price">${producto.precio.toLocaleString('es-AR')}</span>
                      <span className="product-stock">{producto.stock} disponibles</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="menu-footer">
        <div className="container">
          <div className="footer-card">
            <Coffee className="footer-icon" />
            <div className="footer-text">
              <p className="footer-title">¿Consultas sobre el menú?</p>
              <p className="footer-subtitle">Nuestro equipo está para ayudarte</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VistaMozos;