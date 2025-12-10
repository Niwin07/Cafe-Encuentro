import { useState, useEffect } from 'react';
import { Search, Grid, List, Filter, X, Coffee } from 'lucide-react';
import api from '../../services/api';
import './VistaMozos.css';

const VistaMozos = () => {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [vistaGrid, setVistaGrid] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar inventario desde tu API real
  const cargarInventario = async () => {
    setLoading(true);
    try {
      const res = await api.get('/productos');
      const prodsActivos = res.data.productos.filter(p => p.stock > 0);
      setProductos(prodsActivos);
    } catch (error) {
      console.error("Error cargando inventario:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInventario();
    const interval = setInterval(cargarInventario, 120000); // Auto-refresh cada 2 min
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
        <div className="text-center">
          <div className="coffee-spinner">
            <Coffee className="coffee-icon" size={48} />
          </div>
          <p className="loading-text">Preparando el menú...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-wrapper">
      {/* Header con temática café */}
      <header className="menu-header">
        <div className="header-content">
          <div className="header-left">
            <div className="coffee-badge">
              <Coffee size={28} />
            </div>
            <div>
              <h1 className="menu-title">Nuestro Menú</h1>
              <p className="menu-subtitle">Descubrí nuestras delicias artesanales</p>
            </div>
          </div>
          
          {/* Toggle Grid/List */}
          <div className="view-toggle">
            <button
              onClick={() => setVistaGrid(true)}
              className={`toggle-btn ${vistaGrid ? 'active' : ''}`}
              title="Vista en grilla"
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setVistaGrid(false)}
              className={`toggle-btn ${!vistaGrid ? 'active' : ''}`}
              title="Vista en lista"
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Buscar en el menú..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="search-input"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="clear-btn">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Botón filtros móvil */}
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="filter-btn-mobile"
        >
          <Filter size={18} />
          Filtrar por categoría
        </button>
      </header>

      <main className="menu-main">
        {/* Categorías */}
        <div className={`categories-section ${mostrarFiltros ? 'show' : ''}`}>
          <div className="categories-scroll">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setCategoriaSeleccionada(cat);
                  setMostrarFiltros(false);
                }}
                className={`category-chip ${categoriaSeleccionada === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Contador */}
        <div className="results-count">
          <span className="count-text">
            {productosFiltrados.length} {productosFiltrados.length === 1 ? 'plato' : 'platos'} disponibles
          </span>
        </div>

        {/* Productos */}
        {productosFiltrados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3 className="empty-title">No encontramos resultados</h3>
            <p className="empty-text">Intentá con otra búsqueda o categoría</p>
          </div>
        ) : (
          <div className={vistaGrid ? 'products-grid' : 'products-list'}>
            {productosFiltrados.map((producto, idx) => (
              <article
                key={producto.id}
                style={{ animationDelay: `${idx * 50}ms` }}
                className={`product-card ${!vistaGrid ? 'list-view' : ''}`}
              >
                {/* Imagen/Icono */}
                <div className={`product-image ${!vistaGrid ? 'list-image' : ''}`}>
                  <span className="product-emoji">
                    {getCategoryIcon(producto.categoria_nombre)}
                  </span>
                </div>

                {/* Contenido */}
                <div className={`product-content ${!vistaGrid ? 'list-content' : ''}`}>
                  <div className="product-header">
                    <h3 className="product-name">{producto.nombre}</h3>
                    {producto.stock < 5 && (
                      <span className="stock-badge low">
                        ⚠️ Pocas unidades
                      </span>
                    )}
                  </div>

                  {producto.descripcion && (
                    <p className="product-description">
                      {producto.descripcion}
                    </p>
                  )}

                  <div className="product-footer">
                    <span className="product-price">${producto.precio}</span>
                    <span className="product-category">{producto.categoria_nombre}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="menu-footer">
        <div className="footer-content">
          <Coffee size={24} className="footer-icon" />
          <div>
            <p className="footer-title">¿Alguna preferencia alimentaria?</p>
            <p className="footer-text">Consultá con nuestro personal</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VistaMozos;