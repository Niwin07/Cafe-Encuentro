import { useState, useEffect } from 'react';
import api from '../services/api';
import './VistaMozos.css'; // Importamos los estilos específicos

const VistaMozos = () => {
  const [productos, setProductos] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroActual, setFiltroActual] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [ultimoUpdate, setUltimoUpdate] = useState('');

  // 1. Cargar datos iniciales
  const cargarInventario = async () => {
    setLoading(true);
    try {
      // Usamos el endpoint público que devuelve todo
      const res = await api.get('/productos');
      // Filtramos solo los que tienen stock > 0, igual que tu script original
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
  }, []);

  // 2. Efecto para aplicar filtros cuando cambia algo
  useEffect(() => {
    let resultado = productos;

    // Filtro de Texto
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(p => 
        p.nombre.toLowerCase().includes(termino) || 
        (p.ingredientes && p.ingredientes.toLowerCase().includes(termino))
      );
    }

    // Filtro de Categoría / Chips
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

  // 3. Manejo del Modo Oscuro
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
    <div className="mozos-container" style={{ paddingBottom: '80px' }}>
      
      {/* HEADER */}
      <div className="mozos-header">
        <div>
          <h1>🤵 Stock Mozos</h1>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>Actualizado: {ultimoUpdate}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="icon-btn" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button className="icon-btn" onClick={cargarInventario}>
            🔄
          </button>
        </div>
      </div>

      {/* CHIPS DE FILTRO */}
      <div className="chips-wrapper">
        <div className="chips-container">
          <div 
            className={`chip ${filtroActual === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroActual('todos')}
          >
            Todos
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
              {cat}
            </div>
          ))}
        </div>
      </div>

      {/* BUSCADOR */}
      <input 
        type="text" 
        className="search-box-mozo" 
        placeholder="🔍 Buscar plato o ingrediente..." 
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div style={{ textAlign: 'right', fontSize: '12px', color: '#888', marginBottom: '10px' }}>
        {filtrados.length} disponibles
      </div>

      {/* LISTA DE PRODUCTOS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8b5a3c' }}>⏳ Cargando datos...</div>
      ) : (
        <div>
          {filtrados.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>
              No se encontraron productos.
            </div>
          )}

          {filtrados.map((p, index) => {
            // Lógica para mostrar separador de categoría
            const mostrarSeparador = filtroActual === 'todos' && 
              (index === 0 || filtrados[index - 1].categoria_nombre !== p.categoria_nombre);

            return (
              <div key={p.id}>
                {mostrarSeparador && (
                  <div className="category-separator">{p.categoria_nombre || 'Varios'}</div>
                )}
                
                <div className={`card-producto ${p.stock < 5 ? 'stock-low' : 'stock-ok'}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                    <span className="item-name">{p.nombre}</span>
                    <span className="item-price">${p.precio}</span>
                  </div>
                  
                  <div className="ingredients">{p.descripcion || p.ingredientes}</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {p.stock < 5 ? (
                      <span className="stock-badge badge-low">Quedan {p.stock}</span>
                    ) : (
                      <span className="stock-badge badge-ok">{p.stock} u.</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VistaMozos;