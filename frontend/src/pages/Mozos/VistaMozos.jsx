import { useState, useEffect } from 'react';
import { Search, Grid, List, Filter, X, Coffee, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import './VistaMozos.css'; // Asegúrate de que apunte al nuevo CSS

const VistaMozos = () => {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [vistaGrid, setVistaGrid] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false); // Mantener por compatibilidad aunque ahora se muestran siempre
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
      // Filtramos solo productos activos y con stock positivo
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
    // Actualización automática cada 2 minutos
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

  // Iconos por categoría (puedes ampliar esto)
  const getCategoryIcon = (categoria) => {
    const icons = {
      'Bebidas': '🥤', 'Cafés': '☕', 'Comidas': '🍽️',
      'Desayunos': '🥐', 'Postres': '🍰', 'Dulces': '🧁',
      'Snacks': '🍿', 'Ensaladas': '🥗', 'Sandwiches': '🥪',
      'Pastas': '🍝', 'Hamburguesas': '🍔'
    };
    return icons[categoria] || '🍴';
  };

  if (loading) {
    return (
      <div className="loading-container" style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', flexDirection:'column'}}>
        <div style={{fontSize:'3rem', marginBottom:'1rem'}}>☕</div>
        <h2 style={{fontFamily:'Playfair Display', color:'#3e2723'}}>Preparando el menú...</h2>
      </div>
    );
  }

  return (
    <div className="menu-wrapper">
      
      {/* HEADER FLOTANTE */}
      <header className="menu-header">
        <div className="header-top">
          <div className="brand">
            <div className="brand-icon">
              <Coffee size={24} />
            </div>
            <div className="brand-text">
              <h1 className="brand-title">Menú Digital</h1>
              <p className="brand-subtitle">Café Encuentro</p>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              onClick={() => cargarInventario(true)} 
              className={`refresh-btn ${refreshing ? 'animate-spin' : ''}`}
              disabled={refreshing}
              title="Actualizar stock"
            >
              <RefreshCw size={20} />
            </button>
            
            <button
              onClick={() => setVistaGrid(!vistaGrid)}
              className="toggle-btn"
              title={vistaGrid ? "Ver lista" : "Ver grilla"}
            >
              {vistaGrid ? <List size={20} /> : <Grid size={20} />}
            </button>
          </div>
        </div>

        <div className="search-wrapper">
          <div className="search-box">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="¿Qué se les antoja hoy?"
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
      </header>

      <main className="container menu-main">
        {/* CATEGORÍAS (Pills) */}
        <div className="categories">
          <div className="categories-inner">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaSeleccionada(cat)}
                className={`category ${categoriaSeleccionada === cat ? 'active' : ''}`}
              >
                {cat}
                {categoriaSeleccionada === cat && <span className="category-check">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* INFO BAR */}
        <div className="info-bar">
          <p className="results-text">
            Mostrando <strong>{productosFiltrados.length}</strong> {productosFiltrados.length === 1 ? 'opción' : 'opciones'}
            {categoriaSeleccionada !== 'Todos' && <span> en <span className="filter-active">{categoriaSeleccionada}</span></span>}
          </p>
        </div>

        {/* GRID DE PRODUCTOS */}
        {productosFiltrados.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">🍽️</span>
            <h3 style={{fontFamily:'Playfair Display', fontSize:'1.5rem', marginBottom:'0.5rem'}}>
              No encontramos resultados
            </h3>
            <p>Intenta con otra búsqueda o categoría.</p>
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
                style={{ animationDelay: `${idx * 50}ms` }} // Efecto cascada
              >
                <div className="product-media">
                  <div className="product-icon">
                    {getCategoryIcon(producto.categoria_nombre)}
                  </div>
                  {producto.stock < 10 && (
                    <div className="product-badge">
                      <span className="badge-dot"></span>
                      Quedan {producto.stock}
                    </div>
                  )}
                </div>

                <div className="product-body">
                  <span className="product-tag">{producto.categoria_nombre}</span>
                  <h3 className="product-title">{producto.nombre}</h3>

                  {producto.descripcion && (
                    <p className="product-desc">{producto.descripcion}</p>
                  )}

                  <div className="product-meta">
                    <div>
                        <span style={{fontSize:'0.75rem', color:'#999', display:'block', marginBottom:'2px'}}>Precio</span>
                        <span className="product-price">${producto.precio.toLocaleString('es-AR')}</span>
                    </div>
                    {/* Solo mostramos stock numérico si es bajo, sino un check verde */}
                    {producto.stock > 10 ? (
                        <span className="product-stock" style={{background:'#e8f5e9', color:'#2e7d32'}}>
                            Disponible
                        </span>
                    ) : (
                        <span className="product-stock" style={{background:'#fff3e0', color:'#e65100'}}>
                            Stock: {producto.stock}
                        </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      
      <div style={{height: '40px'}}></div>
    </div>
  );
};

export default VistaMozos;