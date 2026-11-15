import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Circle, Clock, Flame, PartyPopper, User } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { cn } from '../../lib/cn';

const POLL_MS = 5000;

const ESTADO_CONFIG = {
  Pendiente: { icon: Circle, boton: 'bg-warning-500 text-white hover:bg-warning-600' },
  'En Preparación': { icon: Flame, boton: 'bg-info-500 text-white hover:bg-info-600' },
  Listo: { icon: CheckCircle2, boton: 'bg-success-500 text-white' },
};

/**
 * Tablero de cocina/cafetería: comparte layout, polling, aviso sonoro y
 * lógica de avance de estado entre ambos destinos, que solo difieren en
 * título, ícono, el flujo de estados disponible y el endpoint a consultar.
 */
// eslint-disable-next-line no-unused-vars -- Icono solo se referencia dentro de JSX (<Icono>), no como identificador plano
export default function TableroDestino({ titulo, subtitulo, icono: Icono, endpoint, flujoEstados, statLabel, vacioTitulo, vacioDescripcion }) {
  const toast = useToast();
  const [pedidos, setPedidos] = useState({});
  const [ultimoUpdate, setUltimoUpdate] = useState(new Date());
  const [permisoSonido, setPermisoSonido] = useState(false);

  const audioRef = useRef(null);
  const prevItemsRef = useRef(0);
  const permisoSonidoRef = useRef(false);
  const primeraCargaRef = useRef(true);

  useEffect(() => {
    audioRef.current = new Audio('/ding.wav');
    audioRef.current.volume = 1.0;
    audioRef.current.load();
  }, []);

  const cargarPedidos = useCallback(async () => {
    try {
      const { data } = await api.get(endpoint);
      const nuevosItems = data.items || {};
      const totalItemsActuales = Object.values(nuevosItems).reduce((sum, list) => sum + list.length, 0);

      if (primeraCargaRef.current) {
        prevItemsRef.current = totalItemsActuales;
        primeraCargaRef.current = false;
      } else {
        if (totalItemsActuales > prevItemsRef.current && permisoSonidoRef.current && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch((e) => console.error('Error reproduciendo aviso sonoro:', e));
          if (navigator.vibrate) navigator.vibrate(200);
        }
        prevItemsRef.current = totalItemsActuales;
      }

      setPedidos(nuevosItems);
      setUltimoUpdate(new Date());
    } catch (err) {
      console.error(`Error conectando con ${endpoint}:`, err);
    }
  }, [endpoint]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- polling intencional: primer fetch inmediato y luego cada POLL_MS
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, POLL_MS);
    return () => clearInterval(intervalo);
  }, [cargarPedidos]);

  const activarSonido = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => {
        setPermisoSonido(true);
        permisoSonidoRef.current = true;
      })
      .catch(() => toast.error('No se pudo activar el aviso sonoro.'));
  };

  const avanzarEstado = async (itemId, estadoActual) => {
    const idx = flujoEstados.indexOf(estadoActual);
    if (idx >= flujoEstados.length - 1) return;
    const nuevoEstado = flujoEstados[idx + 1];
    try {
      await api.patch(`/pedidos/items/${itemId}/estado`, { estado: nuevoEstado });
      cargarPedidos();
    } catch {
      toast.error('No se pudo actualizar el estado del ítem.');
    }
  };

  const totalPedidos = Object.keys(pedidos).length;
  const totalItems = Object.values(pedidos).reduce((sum, items) => sum + items.length, 0);

  return (
    <div className="min-h-screen bg-cream-100 pb-10">
      {!permisoSonido && (
        <button
          onClick={activarSonido}
          className="fixed bottom-5 right-5 z-40 flex animate-pulseSoft items-center gap-2 rounded-full bg-coffee-700 px-5 py-3 text-sm font-bold text-cream-50 shadow-floating transition-colors hover:bg-coffee-800"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          Activar avisos
        </button>
      )}

      <header className="sticky top-0 z-20 border-b border-coffee-900/20 bg-coffee-800 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-50/10 text-cream-50">
              <Icono className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-cream-50 sm:text-2xl">{titulo}</h1>
              <p className="text-xs text-cream-200/80 sm:text-sm">{subtitulo}</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-xl font-bold text-cream-50 sm:text-2xl">{totalPedidos}</p>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-cream-200/70">Pedidos</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-cream-50 sm:text-2xl">{totalItems}</p>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-cream-200/70">{statLabel}</p>
            </div>
            <div className="flex items-center gap-2 text-cream-200">
              <span className="h-2.5 w-2.5 animate-pulseSoft rounded-full bg-success-400" />
              <span className="text-sm font-medium tabular-nums">
                {ultimoUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {totalPedidos === 0 ? (
          <div className="pt-10">
            <EmptyState icon={PartyPopper} title={vacioTitulo} description={vacioDescripcion} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Object.entries(pedidos).map(([pedidoId, items]) => (
              <PedidoDestinoCard key={pedidoId} pedidoId={pedidoId} items={items} onAvanzar={avanzarEstado} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PedidoDestinoCard({ pedidoId, items, onAvanzar }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-cream-200 px-4 py-2.5">
        <Badge variant="neutral" size="sm">
          #{pedidoId.slice(-6)}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-coffee-500">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {new Date(items[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold text-coffee-900">
          <User className="h-3.5 w-3.5 shrink-0 text-coffee-400" aria-hidden="true" />
          {items[0].cliente}
        </span>
        <Badge variant="gold" size="sm">
          {items[0].cajera_nombre}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {items.map((item) => {
          const config = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.Pendiente;
          const EstadoIcon = config.icon;
          return (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-cream-50 p-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-coffee-900">
                  <span className="text-coffee-500">{item.cantidad}×</span> {item.producto_nombre}
                </p>
                {item.acompanamiento_nombre && <p className="mt-0.5 text-xs text-coffee-500">+ {item.acompanamiento_nombre}</p>}
                {item.instrucciones_especiales && (
                  <p className="mt-0.5 flex items-start gap-1 text-xs font-medium text-warning-600">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                    {item.instrucciones_especiales}
                  </p>
                )}
              </div>
              <button
                onClick={() => onAvanzar(item.id, item.estado)}
                disabled={item.estado === 'Listo'}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors disabled:cursor-default',
                  config.boton
                )}
              >
                <EstadoIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {item.estado}
              </button>
            </div>
          );
        })}
      </div>
    </article>
  );
}
