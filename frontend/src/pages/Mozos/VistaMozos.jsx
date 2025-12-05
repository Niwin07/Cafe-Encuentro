import { useState, useEffect } from 'react';
import api from '../../services/api';
import './VistaMozos.css';

const VistaMozos = () => {
  const [productos, setProductos] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroActual, setFiltroActual] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [ultimoUpdate, setUltimoUpdate] = useState('');

  // Cargar datos iniciales
  const cargarInventario = async () => {
    setLoading(true);
    try {
      const res = await api.get('/productos');
      const prodsActivos = res.data.productos.filter(p => p.stock > 0);
      
      setProductos(prodsActivos);
      
      // Extraer categorías únicas
      const cats = [...new Set(prodsActivos.map(p => p.categoria_nombre))].sort();
      setCategorias(cats);
      
      // Actualizar hora
      const d = new Date();
      setUltimoUpdate(`${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`);
      
    } catch (error) {
      console.error("Error cargando inventario:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInventario();
    // Auto-refresh cada 2 minutos
    const interval = setInterval(cargarInventario, 120000);
    return () => clearInterval(interval);
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let resultado = productos;

    // Filtro de Texto
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(p => 
        p.nombre.toLowerCase().includes(termino) || 
        (p.descripcion && p.descripcion.toLowerCase().includes(termino))
      );
    }

    // Filtro de Categoría
    if (filtroActual === 'bajo') {
      resultado = resultado.filter(p => p.stock < 5);
    } else if (filtroActual !== 'todos') {
      resultado = resultado.filter(p => p.categoria_nombre === filtroActual);
    }

    // Ordenamiento: Stock bajo primero, luego por categoría
    resultado.sort((a, b) => {
      if (a.stock < 5 && b.stock >= 5) return -1;
      if (a.stock >= 5 && b.stock < 5) return 1;
      return (a.categoria_nombre || '').localeCompare(b.categoria_nombre || '');
    });

    setFiltrados(resultado);
  }, [productos, filtroActual, busqueda]);

  // Manejo del Modo Oscuro
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <div className="mozos-container">
      <div className="mozos-content">
        
        {/* HEADER PREMIUM */}
        <div className="mozos-header">
          <div className="mozos-header-content">
            <div>
              <h1>
                <span className="mozos-header-emoji">🤵</span> 
                Stock para Mozos
              </h1>
            </div>
            <div className="mozos-header-info">
              <div className="mozos-update-time">
                <div className="mozos-live-dot"></div>
                <span>Actualizado: {ultimoUpdate}</span>
              </div>
              <div className="mozos-actions">
                <button 
                  className="icon-btn" 
                  onClick={() => setDarkMode(!darkMode)} 
                  title={darkMode ? "Modo Claro" : "Modo Oscuro"}
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
                <button 
                  className="icon-btn" 
                  onClick={cargarInventario} 
                  title="Recargar inventario"
                >
                  🔄
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CHIPS DE FILTRO */}
        <div className="chips-wrapper">
          <div className="chips-container">
            <div 
              className={`chip ${filtroActual === 'todos' ? 'active' : ''}`}
              onClick={() => setFiltroActual('todos')}
            >
              ✨ Todos
            </div>
            <div 
              className={`chip ${filtroActual === 'bajo' ? 'active' : ''}`}
              onClick={() => setFiltroActual('bajo')}
            >
              ⚠️ Stock Bajo
            </div>
            {categorias.map(cat => (
              <div 
                key={cat}
                className={`chip ${filtroActual === cat ? 'active' : ''}`}
                onClick={() => setFiltroActual(cat)}
              >
                {getCategoryIcon(cat)} {cat}
              </div>
            ))}
          </div>
        </div>

        {/* BUSCADOR */}
        <div style={{ position: 'relative' }}>
          <span style={{ 
            position: 'absolute', 
            left: '1.25rem', 
            top: '50%', 
            transform: 'translateY(-50%)',
            fontSize: '1.25rem',
            pointerEvents: 'none',
            zIndex: 1
          }}>
          </span>
          <input 
            type="text" 
            className="search-box-mozo" 
            placeholder="Buscar plato, ingrediente o descripción..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* CONTADOR CON BADGE */}
        <div className="mozos-count">
          <span className="mozos-count-text">
            {filtroActual === 'todos' ? 'Productos disponibles' : 
             filtroActual === 'bajo' ? 'Con stock bajo' : 
             `En ${filtroActual}`}
          </span>
          <span className="mozos-count-badge">
            {filtrados.length}
          </span>
        </div>

        {/* LISTA DE PRODUCTOS */}
        {loading ? (
          <div className="mozos-loading">
            <div className="loading-spinner"></div>
            <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>Cargando inventario...</p>
          </div>
        ) : (
          <div>
            {filtrados.length === 0 && (
              <div className="mozos-vacio">
                <div className="vacio-icon">🔍</div>
                <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  No se encontraron productos
                </p>
                <p style={{ fontSize: '0.9375rem', opacity: 0.7 }}>
                  Intenta con otro término de búsqueda o categoría
                </p>
              </div>
            )}

            {filtrados.map((p, index) => {
              // Mostrar separador de categoría
              const mostrarSeparador = filtroActual === 'todos' && 
                (index === 0 || filtrados[index - 1].categoria_nombre !== p.categoria_nombre);

              return (
                <div key={p.id}>
                  {mostrarSeparador && (
                    <div className="category-separator">
                      {getCategoryIcon(p.categoria_nombre)} {p.categoria_nombre || 'Varios'}
                    </div>
                  )}
                  
                  <div className={`card-producto ${p.stock < 5 ? 'stock-low' : 'stock-ok'}`}>
                    <div className="card-header">
                      <h3 className="item-name">{p.nombre}</h3>
                      <span className="item-price">${p.precio}</span>
                    </div>
                    
                    {p.descripcion && (
                      <p className="ingredients">{p.descripcion}</p>
                    )}
                    
                    <div className="card-footer">
                      {p.stock < 5 ? (
                        <span className="stock-badge badge-low">
                          ⚠️ Quedan {p.stock}
                        </span>
                      ) : (
                        <span className="stock-badge badge-ok">
                          ✓ {p.stock} disponibles
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper para iconos de categorías
const getCategoryIcon = (categoria) => {
  const icons = {
    'Bebidas': '☕',
    'Cafés': '☕',
    'Comidas': '🍽️',
    'Desayunos': '🥐',
    'Postres': '🍰',
    'Dulces': '🧁',
    'Snacks': '🍿',
    'Ensaladas': '🥗',
    'Sandwiches': '🥪',
    'Pastas': '🍝'
  };
  
  return icons[categoria] || '🍴';
};

export default VistaMozos;