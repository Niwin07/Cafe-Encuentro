import { useState, useEffect } from 'react';
import { Search, Grid, List, Filter, X } from 'lucide-react';

// Simulación de API para demo
const mockApi = {
  get: async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      data: {
        productos: [
          { id: 1, nombre: 'Cappuccino Especial', descripcion: 'Café expreso con leche vaporizada y espuma cremosa', precio: 4500, categoria_nombre: 'Cafés', stock: 10 },
          { id: 2, nombre: 'Medialunas de Manteca', descripcion: 'Pack de 3 medialunas artesanales recién horneadas', precio: 2800, categoria_nombre: 'Desayunos', stock: 15 },
          { id: 3, nombre: 'Hamburguesa Premium', descripcion: 'Carne angus, queso cheddar, bacon, lechuga, tomate y salsa especial', precio: 8500, categoria_nombre: 'Comidas', stock: 8 },
          { id: 4, nombre: 'Cheesecake de Frutos Rojos', descripcion: 'Cremoso cheesecake con coulis de frutos del bosque', precio: 5200, categoria_nombre: 'Postres', stock: 6 },
          { id: 5, nombre: 'Ensalada Caesar', descripcion: 'Lechuga romana, pollo grillado, parmesano, crutones y aderezo caesar', precio: 6800, categoria_nombre: 'Ensaladas', stock: 12 },
          { id: 6, nombre: 'Limonada Natural', descripcion: 'Jugo de limón recién exprimido con menta fresca', precio: 3200, categoria_nombre: 'Bebidas', stock: 20 },
          { id: 7, nombre: 'Brownie con Helado', descripcion: 'Brownie de chocolate tibio con helado de vainilla', precio: 4800, categoria_nombre: 'Postres', stock: 4 },
          { id: 8, nombre: 'Club Sandwich', descripcion: 'Triple de pan tostado, pollo, bacon, huevo, lechuga y tomate', precio: 7200, categoria_nombre: 'Sandwiches', stock: 10 },
          { id: 9, nombre: 'Café Americano', descripcion: 'Espresso doble con agua caliente', precio: 3200, categoria_nombre: 'Cafés', stock: 25 },
          { id: 10, nombre: 'Tostado Mixto', descripcion: 'Pan de miga tostado con jamón y queso', precio: 4500, categoria_nombre: 'Desayunos', stock: 3 },
        ]
      }
    };
  }
};

const VistaMozos = () => {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [vistaGrid, setVistaGrid] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [loading, setLoading] = useState(true);

  const cargarInventario = async () => {
    setLoading(true);
    try {
      // Reemplazá mockApi por tu api real: api.get('/productos')
      const res = await mockApi.get();
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
    const interval = setInterval(cargarInventario, 120000);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/40">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-slate-700">Cargando menú...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/40">
      {/* Header sticky con glassmorphism */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-orange-100/50 shadow-lg shadow-orange-500/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 bg-clip-text text-transparent">
                Nuestro Menú
              </h1>
              <p className="text-sm text-slate-600 mt-1">Descubrí nuestros deliciosos platos</p>
            </div>
            
            {/* Toggle Grid/List */}
            <div className="hidden sm:flex gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setVistaGrid(true)}
                className={`p-2.5 rounded-lg transition-all ${
                  vistaGrid ? 'bg-white shadow-md text-orange-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setVistaGrid(false)}
                className={`p-2.5 rounded-lg transition-all ${
                  !vistaGrid ? 'bg-white shadow-md text-orange-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar platos, ingredientes..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-white shadow-sm"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Botón filtros móvil */}
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="sm:hidden mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/25 active:scale-95 transition-transform"
          >
            <Filter size={18} />
            Filtrar por categoría
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categorías */}
        <div className={`mb-8 transition-all ${mostrarFiltros ? 'block' : 'hidden sm:block'}`}>
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setCategoriaSeleccionada(cat);
                  setMostrarFiltros(false);
                }}
                className={`flex-shrink-0 snap-start px-6 py-3 rounded-full font-semibold transition-all ${
                  categoriaSeleccionada === cat
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                    : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-orange-300 hover:shadow-md active:scale-95'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Contador */}
        <div className="mb-6">
          <p className="text-slate-600 font-medium">
            {productosFiltrados.length} {productosFiltrados.length === 1 ? 'plato' : 'platos'} disponibles
          </p>
        </div>

        {/* Productos */}
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">🔍</div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">No encontramos resultados</h3>
            <p className="text-slate-600">Intentá con otra búsqueda o categoría</p>
          </div>
        ) : (
          <div className={vistaGrid ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'flex flex-col gap-4'}>
            {productosFiltrados.map((producto, idx) => (
              <article
                key={producto.id}
                style={{ animationDelay: `${idx * 50}ms` }}
                className={`group bg-white rounded-3xl overflow-hidden border-2 border-slate-100 hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 hover:-translate-y-2 opacity-0 animate-fadeIn ${
                  !vistaGrid ? 'flex gap-4 p-4' : ''
                }`}
              >
                {/* Imagen */}
                <div className={`bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 flex items-center justify-center ${
                  vistaGrid ? 'h-48' : 'w-32 h-32 rounded-2xl flex-shrink-0'
                }`}>
                  <span className="text-6xl group-hover:scale-110 transition-transform duration-300">
                    {getCategoryIcon(producto.categoria_nombre)}
                  </span>
                </div>

                {/* Contenido */}
                <div className={vistaGrid ? 'p-5' : 'flex-1 flex flex-col justify-center'}>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-orange-600 transition-colors">
                      {producto.nombre}
                    </h3>
                    {producto.stock < 5 && (
                      <span className="flex-shrink-0 px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full whitespace-nowrap">
                        Pocas unidades
                      </span>
                    )}
                  </div>

                  {producto.descripcion && (
                    <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                      {producto.descripcion}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      ${producto.precio}
                    </span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full font-semibold">
                      {producto.categoria_nombre}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 border-t border-slate-200 bg-white/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-600">
          <p className="font-medium">¿Tenés alguna alergia o preferencia alimentaria?</p>
          <p className="text-sm mt-1">Consultá con nuestro personal</p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
          transform: translateY(20px);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default VistaMozos;