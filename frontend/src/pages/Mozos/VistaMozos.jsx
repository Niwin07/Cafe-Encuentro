import { useEffect, useState } from 'react';
import { Coffee, Grid2x2, List, RefreshCw, Search, X } from 'lucide-react';
import api from '../../services/api';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonGrid } from '../../components/ui/Skeleton';
import { fieldControlClasses } from '../../components/ui/Input';
import IconButton from '../../components/ui/IconButton';
import { cn } from '../../lib/cn';

const ICONOS_CATEGORIA = {
  Bebidas: '🥤',
  Cafés: '☕',
  Café: '☕',
  Comidas: '🍽️',
  Desayunos: '🥐',
  Postres: '🍰',
  Dulces: '🧁',
  Snacks: '🍿',
  Ensaladas: '🥗',
  Sandwiches: '🥪',
  Sandwich: '🥪',
  Pastas: '🍝',
  Hamburguesas: '🍔',
  Pizzas: '🍕',
  Jugos: '🧃',
  Todos: '🍴',
};

const iconoDe = (categoria) => ICONOS_CATEGORIA[categoria] || '🍴';

const REFRESCO_MS = 120000;

export default function VistaMozos() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [vistaGrid, setVistaGrid] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarInventario = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data } = await api.get('/productos');
      setProductos(data.productos.filter((p) => p.stock > 0));
    } catch (err) {
      console.error('Error cargando el menú:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarInventario();
    const interval = setInterval(() => cargarInventario(true), REFRESCO_MS);
    return () => clearInterval(interval);
  }, []);

  const categorias = ['Todos', ...new Set(productos.map((p) => p.categoria_nombre))];
  const tabs = categorias.map((nombre) => ({
    value: nombre,
    label: `${iconoDe(nombre)} ${nombre}`,
    count: nombre === 'Todos' ? productos.length : productos.filter((p) => p.categoria_nombre === nombre).length,
  }));

  const productosFiltrados = productos.filter((p) => {
    const texto = busqueda.toLowerCase();
    const matchBusqueda =
      p.nombre.toLowerCase().includes(texto) || (p.descripcion && p.descripcion.toLowerCase().includes(texto));
    const matchCategoria = categoria === 'Todos' || p.categoria_nombre === categoria;
    return matchBusqueda && matchCategoria;
  });

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoria('Todos');
  };

  return (
    <div className="min-h-screen bg-cream-100 pb-12">
      <header className="sticky top-0 z-20 border-b border-cream-300 bg-cream-50/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coffee-700 text-cream-50 shadow-soft">
                <Coffee className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-coffee-900 sm:text-xl">Menú Digital</h1>
                <p className="text-xs text-coffee-500 sm:text-sm">Café Encuentro</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <IconButton
                label="Actualizar menú"
                onClick={() => cargarInventario(true)}
                disabled={refreshing}
                variant="subtle"
              >
                <RefreshCw className={cn('h-[18px] w-[18px]', refreshing && 'animate-spin')} aria-hidden="true" />
              </IconButton>
              <IconButton
                label={vistaGrid ? 'Cambiar a vista lista' : 'Cambiar a vista cuadrícula'}
                onClick={() => setVistaGrid((v) => !v)}
                variant="subtle"
              >
                {vistaGrid ? <List className="h-[18px] w-[18px]" /> : <Grid2x2 className="h-[18px] w-[18px]" />}
              </IconButton>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-coffee-400" aria-hidden="true" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar productos..."
              aria-label="Buscar productos"
              className={cn(fieldControlClasses, 'pl-10', busqueda && 'pr-10')}
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-coffee-400 transition-colors hover:bg-cream-100 hover:text-coffee-600"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="mt-3 pb-3">
            <Tabs items={tabs} value={categoria} onChange={setCategoria} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        {loading ? (
          <SkeletonGrid count={10} className="sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" />
        ) : productosFiltrados.length === 0 ? (
          <EmptyState
            icon={Search}
            title={busqueda ? 'No encontramos resultados' : 'No hay productos'}
            description={
              busqueda
                ? 'Probá con otra búsqueda o explorá otras categorías.'
                : 'No hay productos disponibles en esta categoría por ahora.'
            }
            action={
              (busqueda || categoria !== 'Todos') && (
                <button onClick={limpiarFiltros} className="text-sm font-semibold text-coffee-700 underline underline-offset-2 hover:text-coffee-900">
                  Ver todo el menú
                </button>
              )
            }
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-coffee-500">
              Mostrando <strong className="text-coffee-800">{productosFiltrados.length}</strong>{' '}
              {productosFiltrados.length === 1 ? 'producto' : 'productos'}
              {categoria !== 'Todos' && (
                <>
                  {' '}
                  en <span className="font-semibold text-coffee-700">{categoria}</span>
                </>
              )}
            </p>

            <div
              className={
                vistaGrid
                  ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5'
                  : 'flex flex-col gap-3'
              }
            >
              {productosFiltrados.map((producto) =>
                vistaGrid ? (
                  <ProductoCardGrid key={producto.id} producto={producto} />
                ) : (
                  <ProductoCardList key={producto.id} producto={producto} />
                )
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ProductoMedia({ producto, className }) {
  return producto.imagen_url ? (
    <img src={producto.imagen_url} alt={producto.nombre} loading="lazy" className={cn('h-full w-full object-cover', className)} />
  ) : (
    <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br from-coffee-100 to-cream-300 text-4xl', className)}>
      {iconoDe(producto.categoria_nombre)}
    </div>
  );
}

function ProductoCardGrid({ producto }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-card">
      <div className="relative h-32 shrink-0 sm:h-36">
        <ProductoMedia producto={producto} />
        {producto.stock < 10 && (
          <span className="absolute right-2 top-2">
            <Badge variant="warning" size="sm">
              Quedan {producto.stock}
            </Badge>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold leading-snug text-coffee-900">{producto.nombre}</h3>
        </div>
        <Badge variant="neutral" size="sm" className="self-start normal-case tracking-normal">
          {producto.categoria_nombre}
        </Badge>
        {producto.descripcion && <p className="line-clamp-2 text-xs text-coffee-500">{producto.descripcion}</p>}
        <div className="mt-auto flex items-end justify-between pt-2">
          <span className="text-lg font-bold text-coffee-800">${producto.precio.toLocaleString('es-AR')}</span>
          {producto.stock > 10 ? (
            <span className="text-xs font-semibold text-success-600">Disponible</span>
          ) : (
            <span className="text-xs font-semibold text-warning-600">Stock: {producto.stock}</span>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductoCardList({ producto }) {
  return (
    <article className="flex gap-3 overflow-hidden rounded-2xl border border-cream-300 bg-white p-2.5 shadow-card sm:gap-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-24">
        <ProductoMedia producto={producto} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-bold text-coffee-900 sm:text-base">{producto.nombre}</h3>
          <Badge variant="neutral" size="sm" className="normal-case tracking-normal">
            {producto.categoria_nombre}
          </Badge>
        </div>
        {producto.descripcion && <p className="line-clamp-1 text-xs text-coffee-500 sm:text-sm">{producto.descripcion}</p>}
        <div className="mt-0.5 flex items-center gap-3">
          <span className="text-base font-bold text-coffee-800 sm:text-lg">${producto.precio.toLocaleString('es-AR')}</span>
          {producto.stock > 10 ? (
            <span className="text-xs font-semibold text-success-600">Disponible</span>
          ) : (
            <span className="text-xs font-semibold text-warning-600">Quedan {producto.stock}</span>
          )}
        </div>
      </div>
    </article>
  );
}
