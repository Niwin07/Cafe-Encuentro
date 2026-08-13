import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Flame, PackageCheck, StickyNote, Trash2, User, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { cn } from '../../lib/cn';

const POLL_MS = 5000;

const ESTADO_BADGE = {
  Pendiente: { variant: 'warning', label: 'pendiente' },
  'En Preparación': { variant: 'info', label: 'en preparación' },
  Listo: { variant: 'success', label: 'listo' },
};

export default function ListaPedidosActivos() {
  const toast = useToast();
  const [pedidos, setPedidos] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarPedidos = useCallback(async () => {
    try {
      const [resCocina, resCafe] = await Promise.all([
        api.get('/pedidos/cocina/activos'),
        api.get('/pedidos/cafeteria/activos'),
      ]);

      const itemsCocina = resCocina.data.items || {};
      const itemsCafe = resCafe.data.items || {};
      const combinados = { ...itemsCocina };

      Object.keys(itemsCafe).forEach((pedidoId) => {
        combinados[pedidoId] = combinados[pedidoId] ? [...combinados[pedidoId], ...itemsCafe[pedidoId]] : itemsCafe[pedidoId];
      });

      setPedidos(combinados);
    } catch (err) {
      console.error('Error cargando pedidos activos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, POLL_MS);
    return () => clearInterval(intervalo);
  }, [cargarPedidos]);

  const entregarPedido = async (e, pedidoId) => {
    e.stopPropagation();
    const ok = await toast.confirm('¿Entregar este pedido al cliente?', { title: 'Entregar pedido', confirmLabel: 'Entregar' });
    if (!ok) return;
    try {
      await api.patch(`/pedidos/${pedidoId}/entregar`);
      cargarPedidos();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo entregar el pedido.');
    }
  };

  const cancelarPedido = async (e, pedidoId) => {
    e.stopPropagation();
    const ok = await toast.confirm('Se devolverá el stock reservado. ¿Cancelar este pedido?', {
      title: 'Cancelar pedido',
      confirmLabel: 'Cancelar pedido',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/pedidos/${pedidoId}/cancelar`);
      toast.success('Pedido cancelado correctamente.');
      cargarPedidos();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo cancelar el pedido.');
    }
  };

  const totalPedidos = Object.keys(pedidos).length;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-cream-200 p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-coffee-900">Pedidos activos</h2>
          <Badge variant="gold" size="sm">
            {totalPedidos}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-coffee-500">Tocá una tarjeta para ver el detalle</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <Spinner />
          </div>
        ) : totalPedidos === 0 ? (
          <EmptyState icon={Sparkles} title="No hay pedidos pendientes" description="Los nuevos pedidos aparecerán acá." compact />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {Object.entries(pedidos).map(([id, items]) => (
              <PedidoCard
                key={id}
                id={id}
                items={items}
                expanded={expandedId === id}
                onToggle={() => setExpandedId((prev) => (prev === id ? null : id))}
                onEntregar={entregarPedido}
                onCancelar={cancelarPedido}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PedidoCard({ id, items, expanded, onToggle, onEntregar, onCancelar }) {
  const listosParaEntregar = items.every((i) => i.estado === 'Listo' || i.estado === 'Cancelado');
  const cliente = items[0]?.cliente || 'Cliente';
  const cajera = items[0]?.cajera_nombre || 'Cajera';

  const estados = {
    Pendiente: items.filter((i) => i.estado === 'Pendiente').length,
    'En Preparación': items.filter((i) => i.estado === 'En Preparación').length,
    Listo: items.filter((i) => i.estado === 'Listo').length,
  };

  const totalPedido = items.reduce((sum, item) => sum + (parseFloat(item.precio_unitario) || 0) * (parseInt(item.cantidad) || 0), 0);

  return (
    <li
      onClick={onToggle}
      className={cn(
        'cursor-pointer rounded-2xl border bg-white p-3 shadow-card transition-colors',
        listosParaEntregar ? 'border-success-300 bg-success-50/40' : 'border-cream-300'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          {expanded ? (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-coffee-400" aria-hidden="true" />
          ) : (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-coffee-400" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-coffee-900">{cliente}</p>
            <p className="flex items-center gap-1 text-xs text-coffee-500">
              <User className="h-3 w-3" aria-hidden="true" />
              {cajera}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <Badge variant="neutral" size="sm">
            #{id.slice(-4)}
          </Badge>
          <p className="mt-1 text-sm font-bold text-coffee-800">${totalPedido.toFixed(2)}</p>
        </div>
      </div>

      {!expanded && (
        <div className="mt-2.5 flex gap-1">
          {items.map((item, idx) => (
            <span
              key={idx}
              title={item.producto_nombre}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                item.estado === 'Listo' ? 'bg-success-500' : item.estado === 'En Preparación' ? 'bg-info-500' : 'bg-warning-400'
              )}
            />
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-3 animate-fadeIn border-t border-cream-200 pt-3">
          <ul className="flex flex-col gap-2.5">
            {items.map((item, idx) => {
              const subtotalItem = item.subtotal
                ? parseFloat(item.subtotal)
                : (parseFloat(item.precio_unitario) || 0) * (parseInt(item.cantidad) || 0);
              return (
                <li key={idx} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-coffee-800">
                      <strong>{item.cantidad}×</strong> {item.producto_nombre}
                    </p>
                    {item.acompanamiento_nombre && <p className="text-xs text-coffee-500">+ {item.acompanamiento_nombre}</p>}
                    {item.instrucciones_especiales && (
                      <p className="flex items-start gap-1 text-xs text-coffee-500">
                        <StickyNote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                        {item.instrucciones_especiales}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full',
                        item.estado === 'Listo' && 'bg-success-100 text-success-600',
                        item.estado === 'En Preparación' && 'bg-info-100 text-info-600',
                        item.estado === 'Pendiente' && 'bg-warning-100 text-warning-600'
                      )}
                      title={item.estado}
                    >
                      {item.estado === 'Listo' ? (
                        <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : item.estado === 'En Preparación' ? (
                        <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <p className="mt-1 text-xs text-coffee-500">${subtotalItem.toFixed(2)}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {Object.entries(estados)
              .filter(([, count]) => count > 0)
              .map(([estado, count]) => (
                <Badge key={estado} variant={ESTADO_BADGE[estado].variant} size="sm">
                  {count} {ESTADO_BADGE[estado].label}
                </Badge>
              ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {listosParaEntregar ? (
          <Button size="sm" variant="success" fullWidth icon={PackageCheck} onClick={(e) => onEntregar(e, id)}>
            Entregar
          </Button>
        ) : (
          <p className="flex-1 text-center text-xs font-medium text-coffee-500">En proceso…</p>
        )}
        <IconButton label="Cancelar pedido" variant="danger" size="sm" onClick={(e) => onCancelar(e, id)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </li>
  );
}
