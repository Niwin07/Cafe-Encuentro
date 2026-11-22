import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Eye, ScrollText, StickyNote, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Tabs from '../../components/ui/Tabs';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import IconButton from '../../components/ui/IconButton';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { METODOS_PAGO, infoMetodoPago } from '../../lib/metodosPago';

const SECTORES = [
  { value: 'GENERAL', label: 'Todo' },
  { value: 'COCINA', label: '🍳 Cocina' },
  { value: 'CAFETERIA', label: '☕ Cafetería' },
];

const esCancelado = (estado) => !!estado && estado.toUpperCase() === 'CANCELADO';

const FILTROS_PAGO = [{ value: 'TODOS', label: 'Todos los pagos' }, ...METODOS_PAGO];

function BadgeMetodoPago({ metodo }) {
  const info = infoMetodoPago(metodo);
  if (!info) return <Badge variant="neutral" size="sm">Sin dato</Badge>;
  const Icono = info.icon;
  return (
    <Badge variant={info.badge} size="sm">
      <Icono className="h-3 w-3" aria-hidden="true" />
      {info.label}
    </Badge>
  );
}

export default function Registros() {
  const [, setLocation] = useLocation();
  const toast = useToast();

  // Fecha local. Antes era toISOString() (UTC): en Argentina, desde las 21:00
  // el filtro "hoy" abría en el día siguiente y no mostraba los pedidos del evento.
  const ahora = new Date();
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  const [fechaDesde, setFechaDesde] = useState(hoy);
  const [fechaHasta, setFechaHasta] = useState(hoy);
  const [filtroSector, setFiltroSector] = useState('GENERAL');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [categorias, setCategorias] = useState([]);

  // Con categoría elegida, los totales son la suma de los items de esa categoría
  const nombreCategoria = categorias.find((c) => String(c.id) === filtroCategoria)?.nombre;
  const porItems = filtroSector !== 'GENERAL' || !!filtroCategoria;

  useEffect(() => {
    api
      .get('/categorias')
      .then(({ data }) => setCategorias(Array.isArray(data) ? data : []))
      .catch(() => setCategorias([]));
  }, []);

  const [datosCargados, setDatosCargados] = useState([]);
  const [filtroPago, setFiltroPago] = useState('TODOS');
  const [loading, setLoading] = useState(false);

  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cerrarDetalle = useCallback(() => setPedidoSeleccionado(null), []);

  const obtenerTotalFila = useCallback(
    (p) => {
      if (!porItems) return p.total;
      if (p.items) return p.items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0).toFixed(2);
      return 0;
    },
    [porItems]
  );

  // Filtro por método de pago (en el cliente: los datos del rango ya están cargados)
  const datosMostrados = useMemo(
    () => (filtroPago === 'TODOS' ? datosCargados : datosCargados.filter((p) => p.metodo_pago === filtroPago)),
    [datosCargados, filtroPago]
  );

  // Totales del listado visible y lo cobrado por cada método (sin cancelados)
  const totales = useMemo(() => {
    const importe = (p) => parseFloat(obtenerTotalFila(p)) || 0;
    const validos = datosMostrados.filter((p) => {
      const estado = (p.estado_general || '').toUpperCase().trim();
      return estado !== 'CANCELADO' && estado !== 'ANULADO';
    });
    const porMetodo = {};
    validos.forEach((p) => {
      const clave = p.metodo_pago || 'SIN_DATO';
      porMetodo[clave] = (porMetodo[clave] || 0) + importe(p);
    });
    return {
      total: validos.reduce((acc, p) => acc + importe(p), 0),
      cantidad: validos.length,
      porMetodo,
    };
  }, [datosMostrados, obtenerTotalFila]);

  const formatoPesos = (n) => new Intl.NumberFormat('es-AR').format(n);

  const cargarHistorial = useCallback(async () => {
    setLoading(true);
    try {
      const rango = `fecha_desde=${fechaDesde} 00:00:00&fecha_hasta=${fechaHasta} 23:59:59`;
      const cat = filtroCategoria ? `&categoria_id=${encodeURIComponent(filtroCategoria)}` : '';
      let url;
      if (filtroSector === 'COCINA') url = `/registros/cocina?${rango}${cat}`;
      else if (filtroSector === 'CAFETERIA') url = `/registros/cafeteria?${rango}${cat}`;
      else if (filtroCategoria) url = `/registros/todos?${rango}${cat}`;
      else url = `/pedidos?${rango}&limite=1000`;

      const { data } = await api.get(url);
      const resultado = url.startsWith('/pedidos') ? data.pedidos || [] : data.registros || [];

      setDatosCargados(resultado);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta, filtroSector, filtroCategoria, toast]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const abrirDetalle = useCallback(
    async (pedido) => {
      if (porItems && pedido.items) {
        setPedidoSeleccionado(pedido);
        return;
      }
      setCargandoDetalle(true);
      try {
        const { data } = await api.get(`/pedidos/${pedido.pedido_id || pedido.id}`);
        setPedidoSeleccionado(data);
      } catch (err) {
        console.error(err);
        toast.error('No se pudieron cargar los detalles.');
      } finally {
        setCargandoDetalle(false);
      }
    },
    [porItems, toast]
  );

  const eliminarPedido = useCallback(
    async (id) => {
      const ok = await toast.confirm('Esto afectará la caja. ¿Eliminar este registro?', {
        title: 'Eliminar registro',
        confirmLabel: 'Eliminar',
        danger: true,
      });
      if (!ok) return;
      try {
        await api.delete(`/pedidos/${id}`);
        cargarHistorial();
      } catch (err) {
        toast.error(err.response?.data?.mensaje || 'No se pudo eliminar el registro.');
      }
    },
    [toast, cargarHistorial]
  );

  // useMemo: evita recrear los objetos de columna (con sus render functions) en
  // cada render del componente. Solo se recalcula cuando cambia filtroSector.
  const columnas = useMemo(
    () => [
      {
        key: 'fecha',
        header: 'Fecha',
        render: (p) => (
          <div className="flex flex-col text-xs text-coffee-500">
            <span className="font-medium text-coffee-700">{new Date(p.fecha_hora).toLocaleDateString('es-AR')}</span>
            <span>{new Date(p.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ),
      },
      {
        key: 'cliente',
        header: 'Cliente',
        cardLabel: false,
        render: (p) => <span className="font-bold text-coffee-900">{p.cliente}</span>,
      },
      { key: 'cajera', header: 'Cajera', render: (p) => <Badge variant="neutral" size="sm">{p.cajera_nombre}</Badge> },
      { key: 'pago', header: 'Pago', render: (p) => <BadgeMetodoPago metodo={p.metodo_pago} /> },
      {
        key: 'estado',
        header: 'Estado',
        align: 'center',
        render: (p) => (
          <Badge variant={esCancelado(p.estado_general) ? 'danger' : 'success'} size="sm">
            {p.estado_general}
          </Badge>
        ),
      },
      {
        key: 'total',
        header: filtroCategoria ? `Subtotal ${nombreCategoria || 'categoría'}` : filtroSector === 'GENERAL' ? 'Total ticket' : 'Subtotal sector',
        align: 'right',
        render: (p) => (
          <span className={esCancelado(p.estado_general) ? 'text-coffee-400 line-through' : 'font-bold text-coffee-900'}>
            ${obtenerTotalFila(p)}
          </span>
        ),
      },
    ],
    [filtroSector, filtroCategoria, nombreCategoria, obtenerTotalFila]
  );

  return (
    <div className="min-h-screen bg-cream-100 pb-10">
      <header className="border-b border-cream-300 bg-cream-50 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <IconButton label="Volver" variant="subtle" onClick={() => setLocation('/pedidos')}>
              <ArrowLeft className="h-[18px] w-[18px]" />
            </IconButton>
            <h1 className="flex items-center gap-2 text-xl font-bold text-coffee-900 sm:text-2xl">
              <ScrollText className="h-5 w-5 text-coffee-500" aria-hidden="true" />
              Registros
              {filtroSector !== 'GENERAL' && <span className="text-base font-medium text-coffee-500">({filtroSector})</span>}
            </h1>
          </div>

          <div className="mt-4">
            <Tabs items={SECTORES} value={filtroSector} onChange={setFiltroSector} />
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Input type="date" label="Desde" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} wrapperClassName="w-auto" />
            <Input type="date" label="Hasta" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} wrapperClassName="w-auto" />
            <Select
              label="Categoría"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              wrapperClassName="w-auto min-w-[12rem]"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4">
            <Tabs items={FILTROS_PAGO} value={filtroPago} onChange={setFiltroPago} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-sm">
          <div className="rounded-2xl border border-cream-300 bg-white p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">
              Tickets {porItems && 'con items'}
            </p>
            <p className="mt-1 text-2xl font-bold text-coffee-900">{totales.cantidad}</p>
          </div>
          <div className="rounded-2xl border border-cream-300 bg-white p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">
              {filtroCategoria
                ? `Ventas ${nombreCategoria || 'categoría'}`
                : filtroSector === 'GENERAL'
                  ? 'Facturación total'
                  : `Ventas ${filtroSector.toLowerCase()}`}
            </p>
            <p className="mt-1 text-2xl font-bold text-coffee-900">${formatoPesos(totales.total)}</p>
          </div>
        </div>

        {/* Cobrado por método de pago (útil para el cierre de caja) */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {METODOS_PAGO.map(({ value, label, icon }) => {
            const Icono = icon;
            return (
            <div key={value} className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-white p-3 shadow-card">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream-200 text-coffee-600">
                <Icono className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">{label}</p>
                <p className="text-lg font-bold text-coffee-900">${formatoPesos(totales.porMetodo[value] || 0)}</p>
              </div>
            </div>
            );
          })}
        </div>
        {totales.porMetodo.SIN_DATO > 0 && (
          <p className="-mt-3 mb-5 text-xs text-coffee-400">
            ${formatoPesos(totales.porMetodo.SIN_DATO)} corresponden a pedidos anteriores sin método de pago registrado.
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Spinner />
          </div>
        ) : (
          <Table
            columns={columnas}
            data={datosMostrados}
            emptyState={
              <EmptyState
                icon={ScrollText}
                title={filtroCategoria ? `No hay ventas de ${nombreCategoria || 'esa categoría'} en este período` : `No hay registros en ${filtroSector.toLowerCase()}`}
              />
            }
            renderActions={(p) => (
              <>
                <IconButton label="Ver detalle" size="sm" variant="ghost" onClick={() => abrirDetalle(p)}>
                  <Eye className="h-4 w-4" />
                </IconButton>
                {/* Eliminar borra el pedido completo: solo en la vista sin filtros de sector/categoría */}
                {!porItems && (
                  <IconButton label="Eliminar registro" size="sm" variant="danger" onClick={() => eliminarPedido(p.id || p.pedido_id)}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )}
              </>
            )}
          />
        )}
      </main>

      <Modal
        open={!!pedidoSeleccionado || cargandoDetalle}
        onClose={cerrarDetalle}
        title={pedidoSeleccionado ? `Ticket #${(pedidoSeleccionado.id || pedidoSeleccionado.pedido_id).toString().slice(-6)}` : 'Cargando…'}
        size="md"
      >
        {cargandoDetalle || !pedidoSeleccionado ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-cream-100 p-3 text-sm">
              <p>
                <span className="font-semibold text-coffee-700">Cliente:</span> {pedidoSeleccionado.cliente}
              </p>
              <p className="mt-1 flex items-center gap-2">
                <span className="font-semibold text-coffee-700">Pago:</span>
                <BadgeMetodoPago metodo={pedidoSeleccionado.metodo_pago} />
              </p>
              {pedidoSeleccionado.notas && (
                <p className="mt-1 flex items-start gap-1 italic text-coffee-500">
                  <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {pedidoSeleccionado.notas}
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-coffee-400">
                {filtroCategoria
                  ? `Items de ${nombreCategoria || 'la categoría'}`
                  : filtroSector === 'GENERAL'
                    ? 'Todos los items'
                    : `Items de ${filtroSector}`}
              </p>
              <ul className="flex flex-col gap-2">
                {pedidoSeleccionado.items?.map((item, idx) => (
                  <li key={item.id || idx} className="flex items-start justify-between gap-3 rounded-xl bg-cream-50 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-coffee-900">
                        {item.cantidad} × {item.producto_nombre}
                      </p>
                      {item.acompanamiento_nombre && <p className="text-xs text-coffee-500">+ {item.acompanamiento_nombre}</p>}
                      {item.instrucciones_especiales && (
                        <p className="mt-0.5 flex items-start gap-1 text-xs text-coffee-500">
                          <StickyNote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                          {item.instrucciones_especiales}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-bold text-coffee-800">${item.subtotal}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-coffee-700 px-4 py-3 text-cream-50">
              <span className="text-sm font-semibold">
                {filtroCategoria ? `Total ${nombreCategoria || 'categoría'}` : filtroSector === 'GENERAL' ? 'Total ticket' : 'Total sector'}
              </span>
              <span className="text-lg font-bold">
                ${porItems ? obtenerTotalFila(pedidoSeleccionado) : pedidoSeleccionado.total}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
