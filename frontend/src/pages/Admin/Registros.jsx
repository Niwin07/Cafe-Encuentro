import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Eye, ScrollText, StickyNote, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Tabs from '../../components/ui/Tabs';
import Input from '../../components/ui/Input';
import IconButton from '../../components/ui/IconButton';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const SECTORES = [
  { value: 'GENERAL', label: 'Todo' },
  { value: 'COCINA', label: '🍳 Cocina' },
  { value: 'CAFETERIA', label: '☕ Cafetería' },
];

const esCancelado = (estado) => !!estado && estado.toUpperCase() === 'CANCELADO';

export default function Registros() {
  const [, setLocation] = useLocation();
  const toast = useToast();

  const hoy = new Date().toISOString().split('T')[0];
  const [fechaDesde, setFechaDesde] = useState(hoy);
  const [fechaHasta, setFechaHasta] = useState(hoy);
  const [filtroSector, setFiltroSector] = useState('GENERAL');

  const [datosMostrados, setDatosMostrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totales, setTotales] = useState({ total: 0, cantidad: 0 });

  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => {
    cargarHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cargarHistorial lee estos mismos valores, no necesita estar en la lista
  }, [fechaDesde, fechaHasta, filtroSector]);

  const obtenerTotalFila = (p) => {
    if (filtroSector === 'GENERAL') return p.total;
    if (p.items) return p.items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0).toFixed(2);
    return 0;
  };

  const calcularTotales = (lista, sector) => {
    const pedidosValidos = lista.filter((p) => {
      if (!p.estado_general) return true;
      const estado = p.estado_general.toUpperCase().trim();
      return estado !== 'CANCELADO' && estado !== 'ANULADO';
    });

    let totalDinero = 0;
    if (sector === 'GENERAL') {
      totalDinero = pedidosValidos.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);
    } else {
      pedidosValidos.forEach((p) => {
        if (p.items && Array.isArray(p.items)) {
          totalDinero += p.items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
        }
      });
    }

    setTotales({ total: totalDinero, cantidad: pedidosValidos.length });
  };

  const cargarHistorial = async () => {
    setLoading(true);
    try {
      const rango = `fecha_desde=${fechaDesde} 00:00:00&fecha_hasta=${fechaHasta} 23:59:59`;
      let url;
      if (filtroSector === 'COCINA') url = `/registros/cocina?${rango}`;
      else if (filtroSector === 'CAFETERIA') url = `/registros/cafeteria?${rango}`;
      else url = `/pedidos?${rango}&limite=1000`;

      const { data } = await api.get(url);
      const resultado = filtroSector === 'GENERAL' ? data.pedidos || [] : data.registros || [];

      setDatosMostrados(resultado);
      calcularTotales(resultado, filtroSector);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalle = async (pedido) => {
    if (filtroSector !== 'GENERAL' && pedido.items) {
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
  };

  const eliminarPedido = async (id) => {
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
  };

  const columnas = [
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
      header: filtroSector === 'GENERAL' ? 'Total ticket' : 'Subtotal sector',
      align: 'right',
      render: (p) => (
        <span className={esCancelado(p.estado_general) ? 'text-coffee-400 line-through' : 'font-bold text-coffee-900'}>
          ${obtenerTotalFila(p)}
        </span>
      ),
    },
  ];

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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-sm">
          <div className="rounded-2xl border border-cream-300 bg-white p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">
              Tickets {filtroSector !== 'GENERAL' && 'con items'}
            </p>
            <p className="mt-1 text-2xl font-bold text-coffee-900">{totales.cantidad}</p>
          </div>
          <div className="rounded-2xl border border-cream-300 bg-white p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">
              {filtroSector === 'GENERAL' ? 'Facturación total' : `Ventas ${filtroSector.toLowerCase()}`}
            </p>
            <p className="mt-1 text-2xl font-bold text-coffee-900">${new Intl.NumberFormat('es-AR').format(totales.total)}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Spinner />
          </div>
        ) : (
          <Table
            columns={columnas}
            data={datosMostrados}
            emptyState={<EmptyState icon={ScrollText} title={`No hay registros en ${filtroSector.toLowerCase()}`} />}
            renderActions={(p) => (
              <>
                <IconButton label="Ver detalle" size="sm" variant="ghost" onClick={() => abrirDetalle(p)}>
                  <Eye className="h-4 w-4" />
                </IconButton>
                {filtroSector === 'GENERAL' && (
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
        onClose={() => setPedidoSeleccionado(null)}
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
              {pedidoSeleccionado.notas && (
                <p className="mt-1 flex items-start gap-1 italic text-coffee-500">
                  <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {pedidoSeleccionado.notas}
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-coffee-400">
                {filtroSector === 'GENERAL' ? 'Todos los items' : `Items de ${filtroSector}`}
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
              <span className="text-sm font-semibold">{filtroSector === 'GENERAL' ? 'Total ticket' : 'Total sector'}</span>
              <span className="text-lg font-bold">
                ${filtroSector === 'GENERAL' ? pedidoSeleccionado.total : obtenerTotalFila(pedidoSeleccionado)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
