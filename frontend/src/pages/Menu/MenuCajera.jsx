import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  BarChart3,
  Coffee,
  LogOut,
  Search,
  Settings,
  ShoppingCart,
  StickyNote,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ListaPedidosActivos from './ListaPedidosActivos';
import ModalProducto from '../../components/ModalProducto';
import Tabs from '../../components/ui/Tabs';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonGrid } from '../../components/ui/Skeleton';
import { fieldControlClasses } from '../../components/ui/Input';
import { cn } from '../../lib/cn';

export default function MenuCajera() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [, setLocation] = useLocation();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [cargandoMenu, setCargandoMenu] = useState(true);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [tabActiva, setTabActiva] = useState('catalogo');

  const clienteInputRef = useRef(null);

  useEffect(() => {
    if (tabActiva === 'carrito' && clienteInputRef.current) {
      clienteInputRef.current.focus();
    }
  }, [tabActiva]);

  const cargarDatos = useCallback(async () => {
    try {
      const { data } = await api.get('/productos/menu');
      setProductos(data.menu);
      const cats = [...new Set(data.menu.map((p) => p.categoria.nombre))];
      setCategorias(['Todas', ...cats]);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el catálogo de productos.');
    } finally {
      setCargandoMenu(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const abrirModalProducto = (producto) => {
    if (producto.stock <= 0) {
      toast.warning('No hay stock de este producto.');
      return;
    }
    setProductoSeleccionado(producto);
  };

  const agregarAlCarrito = (itemConfigurado) => {
    let prodVinculadoId = null;
    if (itemConfigurado.acompanamiento_id) {
      const acompOriginal = itemConfigurado.acompanamientos?.find(
        (a) => a.id.toString() === itemConfigurado.acompanamiento_id.toString()
      );
      if (acompOriginal) prodVinculadoId = acompOriginal.producto_vinculado_id;
    }

    const itemCart = {
      tempId: Date.now(),
      id: itemConfigurado.id,
      nombre: itemConfigurado.nombre,
      precio: itemConfigurado.precio,
      cantidad: itemConfigurado.cantidad,
      acompanamiento_id: itemConfigurado.acompanamiento_id,
      acompanamiento_nombre: itemConfigurado.acompanamiento_nombre,
      acompanamiento_vinculado_id: prodVinculadoId,
      notas: itemConfigurado.instrucciones_especiales,
      destino_id: itemConfigurado.destino.id,
    };

    setCarrito((prev) => [...prev, itemCart]);
    if (window.innerWidth < 1024) setTabActiva('carrito');
  };

  const eliminarDelCarrito = (tempId) => {
    setCarrito((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const confirmarPedido = async () => {
    if (!cliente.trim()) {
      toast.warning('Falta el nombre del cliente.');
      return;
    }
    if (carrito.length === 0) {
      toast.warning('El carrito está vacío.');
      return;
    }

    const itemsSinAcompRequerido = carrito
      .filter((item) => {
        const prodOriginal = productos.find((p) => p.id === item.id);
        return prodOriginal?.acompanamientos?.length > 0 && !item.acompanamiento_id;
      })
      .map((item) => item.nombre);

    if (itemsSinAcompRequerido.length > 0) {
      toast.error(`Falta seleccionar acompañamiento para: ${itemsSinAcompRequerido.join(', ')}`);
      return;
    }

    setProcesando(true);
    try {
      const payload = {
        cliente,
        items: carrito.map((item) => ({
          producto_id: item.id,
          cantidad: item.cantidad,
          acompanamiento_id: item.acompanamiento_id,
          instrucciones_especiales: item.notas,
        })),
      };
      await api.post('/pedidos', payload);
      toast.success('Pedido confirmado.');
      setCarrito([]);
      setCliente('');
      cargarDatos();
      if (window.innerWidth < 1024) setTabActiva('pedidos');
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo confirmar el pedido.');
    } finally {
      setProcesando(false);
    }
  };

  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  const busquedaLower = useMemo(() => busqueda.toLowerCase(), [busqueda]);

  const productosFiltrados = useMemo(
    () =>
      productos.filter((p) => {
        const matchCategoria = categoriaSeleccionada === 'Todas' || p.categoria.nombre === categoriaSeleccionada;
        const matchBusqueda =
          busqueda === '' ||
          p.nombre.toLowerCase().includes(busquedaLower) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(busquedaLower));
        return matchCategoria && matchBusqueda;
      }),
    [productos, categoriaSeleccionada, busqueda, busquedaLower]
  );

  const seccionTabs = [
    { value: 'catalogo', label: 'Catálogo', icon: UtensilsCrossed },
    { value: 'carrito', label: 'Carrito', icon: ShoppingCart, count: carrito.length || undefined },
    { value: 'pedidos', label: 'Activos', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream-100">
      <header className="flex shrink-0 items-center justify-between gap-3 bg-coffee-800 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-50/10 text-cream-50">
            <Coffee className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-cream-50 sm:text-lg">Café Encuentro</h1>
            <p className="truncate text-xs text-cream-200/80">
              Cajera: <strong className="font-semibold text-cream-50">{user?.nombre}</strong>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton label="Registros" variant="on-dark" onClick={() => setLocation('/registros')}>
            <BarChart3 className="h-[18px] w-[18px]" />
          </IconButton>
          <IconButton label="Administración" variant="on-dark" onClick={() => setLocation('/admin')}>
            <Settings className="h-[18px] w-[18px]" />
          </IconButton>
          <IconButton label="Cerrar sesión" variant="on-dark" onClick={logout}>
            <LogOut className="h-[18px] w-[18px]" />
          </IconButton>
        </div>
      </header>

      <div className="shrink-0 border-b border-cream-300 bg-cream-50 px-4 py-2 sm:px-6 lg:hidden">
        <Tabs items={seccionTabs} value={tabActiva} onChange={setTabActiva} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Catálogo */}
        <section
          className={cn(
            'min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6',
            tabActiva === 'catalogo' ? 'flex' : 'hidden',
            'lg:flex'
          )}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-coffee-400" aria-hidden="true" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              aria-label="Buscar producto"
              className={cn(fieldControlClasses, 'pl-10')}
            />
          </div>

          <div className="mt-3">
            <Tabs items={categorias.map((c) => ({ value: c, label: c }))} value={categoriaSeleccionada} onChange={setCategoriaSeleccionada} />
          </div>

          <div className="mt-4 flex-1">
            {cargandoMenu ? (
              <SkeletonGrid count={8} className="sm:grid-cols-3 xl:grid-cols-4" />
            ) : productosFiltrados.length === 0 ? (
              <EmptyState icon={Search} title="No se encontraron productos" compact />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {productosFiltrados.map((prod) => (
                  <ProductoCardPOS key={prod.id} producto={prod} onClick={() => abrirModalProducto(prod)} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Carrito */}
        <aside
          className={cn(
            'min-h-0 w-full shrink-0 flex-col border-cream-300 bg-white',
            tabActiva === 'carrito' ? 'flex' : 'hidden',
            'lg:flex lg:w-[380px] lg:border-l'
          )}
        >
          <div className="shrink-0 border-b border-cream-200 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-coffee-900">
              <ShoppingCart className="h-5 w-5 text-coffee-500" aria-hidden="true" />
              Pedido actual
            </h2>
            <Input
              ref={clienteInputRef}
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nombre del cliente o mesa..."
              aria-label="Nombre del cliente o mesa"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {carrito.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="El carrito está vacío" description="Seleccioná productos del catálogo." compact />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {carrito.map((item) => (
                  <li key={item.tempId} className="animate-fadeIn rounded-xl border border-cream-200 bg-cream-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-coffee-900">
                          <span className="text-coffee-500">{item.cantidad}×</span> {item.nombre}
                        </p>
                        {item.acompanamiento_nombre && (
                          <p className="mt-0.5 text-xs text-coffee-500">+ {item.acompanamiento_nombre}</p>
                        )}
                        {item.notas && (
                          <p className="mt-0.5 flex items-start gap-1 text-xs text-coffee-500">
                            <StickyNote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                            {item.notas}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-bold text-coffee-800">${(item.precio * item.cantidad).toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => eliminarDelCarrito(item.tempId)}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-danger-600 hover:text-danger-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="shrink-0 border-t border-cream-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-coffee-600">Total</span>
              <span className="text-2xl font-bold text-coffee-900">${total.toFixed(2)}</span>
            </div>
            <Button fullWidth size="lg" loading={procesando} disabled={carrito.length === 0} onClick={confirmarPedido}>
              {procesando ? 'Procesando…' : `Confirmar pedido (${carrito.length})`}
            </Button>
          </div>
        </aside>

        {/* Pedidos activos */}
        <aside
          className={cn(
            'min-h-0 w-full shrink-0 flex-col border-cream-300 bg-white',
            tabActiva === 'pedidos' ? 'flex' : 'hidden',
            'lg:flex lg:w-[360px] lg:border-l'
          )}
        >
          <ListaPedidosActivos />
        </aside>
      </div>

      {productoSeleccionado && (
        <ModalProducto
          key={productoSeleccionado.id}
          producto={productoSeleccionado}
          carrito={carrito}
          onClose={() => setProductoSeleccionado(null)}
          onConfirm={agregarAlCarrito}
        />
      )}
    </div>
  );
}

function ProductoCardPOS({ producto, onClick }) {
  const sinStock = producto.stock === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={sinStock}
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-cream-300 bg-white text-left shadow-card transition-all',
        'hover:-translate-y-0.5 hover:shadow-elevated hover:border-coffee-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2',
        sinStock && 'cursor-not-allowed opacity-50 hover:translate-y-0 hover:shadow-card'
      )}
    >
      <div className="relative h-24 shrink-0 sm:h-28">
        {producto.imagen_url ? (
          <img src={producto.imagen_url} alt={producto.nombre} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-coffee-100 to-cream-300">
            <Coffee className="h-8 w-8 text-coffee-400" aria-hidden="true" />
          </div>
        )}
        {producto.stock > 0 && producto.stock < 5 && (
          <span className="absolute right-1.5 top-1.5">
            <Badge variant="warning" size="sm">
              Quedan {producto.stock}
            </Badge>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-coffee-900">{producto.nombre}</h3>
        <p className="text-xs text-coffee-400">Stock: {producto.stock}</p>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="text-base font-bold text-coffee-800">${producto.precio}</span>
        </div>
      </div>
    </button>
  );
}
