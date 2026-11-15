import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Select from './ui/Select';
import Textarea from './ui/Textarea';
import Badge from './ui/Badge';

/**
 * Configura un producto (cantidad, acompañamiento obligatorio si aplica,
 * notas) antes de agregarlo al carrito. El cálculo de stock disponible
 * descuenta lo que ya está en el carrito, incluyendo el caso en que un
 * acompañamiento esté vinculado a otro producto del catálogo (ej. "Coca
 * como acompañamiento" descuenta del mismo stock que "Coca como producto").
 *
 * El padre debe montar este componente con `key={producto.id}` para que el
 * estado del formulario se reinicie al cambiar de producto.
 */
export default function ModalProducto({ producto, carrito, onClose, onConfirm }) {
  const toast = useToast();
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  const [acompanamientoId, setAcompanamientoId] = useState('');

  // Todos los cálculos de stock se memoizan con [carrito, producto]:
  // cuando el usuario escribe en "nota" o cambia "cantidad", estos reduce
  // no se re-ejecutan (el carrito no cambió). Sin useMemo corrían en cada
  // keystroke, iterando el carrito N veces por cada opción de acompañamiento.
  const { enCarritoPrincipal, enCarritoComoAcomp, stockRealProducto, opcionesDisponibles, stockPorAcomp } = useMemo(() => {
    if (!producto) {
      return { enCarritoPrincipal: 0, enCarritoComoAcomp: 0, stockRealProducto: 0, opcionesDisponibles: [], stockPorAcomp: {} };
    }

    const enCarritoPrincipal = carrito.reduce(
      (acc, item) => (item.id === producto.id ? acc + item.cantidad : acc),
      0
    );
    const enCarritoComoAcomp = carrito.reduce(
      (acc, item) => (item.acompanamiento_vinculado_id === producto.id ? acc + item.cantidad : acc),
      0
    );
    const stockRealProducto = producto.stock - enCarritoPrincipal - enCarritoComoAcomp;
    const opcionesDisponibles = producto.acompanamientos || [];

    // Calcula stock de cada acompañamiento en un único recorrido por opción,
    // en lugar de llamar a una función que recorre el carrito en cada render del select.
    const stockPorAcomp = opcionesDisponibles.reduce((acc, op) => {
      const usoDirecto = carrito.reduce((s, item) => (item.acompanamiento_id == op.id ? s + item.cantidad : s), 0);
      const usoVinculado = op.producto_vinculado_id
        ? carrito.reduce((s, item) => (item.id === op.producto_vinculado_id ? s + item.cantidad : s), 0)
        : 0;
      acc[op.id] = op.stock - usoDirecto - usoVinculado;
      return acc;
    }, {});

    return { enCarritoPrincipal, enCarritoComoAcomp, stockRealProducto, opcionesDisponibles, stockPorAcomp };
  }, [carrito, producto]);

  // Early return DESPUÉS de todos los hooks (Rules of Hooks)
  if (!producto) return null;

  const acompSeleccionado = opcionesDisponibles.find((op) => op.id.toString() === acompanamientoId.toString());
  const stockRealAcomp = acompSeleccionado ? (stockPorAcomp[acompSeleccionado.id] ?? 0) : 0;
  const stockInsuficienteAcomp = !!acompSeleccionado && stockRealAcomp < cantidad;
  const stockInsuficienteProd = stockRealProducto < cantidad;
  const faltaAcompanamiento = opcionesDisponibles.length > 0 && !acompanamientoId;

  const handleConfirm = () => {
    if (stockInsuficienteProd) {
      toast.error(`Stock insuficiente del producto. Quedan ${stockRealProducto} reales.`);
      return;
    }
    if (stockInsuficienteAcomp) {
      toast.error(`Stock insuficiente de "${acompSeleccionado.nombre}". Quedan ${stockRealAcomp} reales.`);
      return;
    }

    onConfirm({
      ...producto,
      cantidad,
      instrucciones_especiales: nota,
      acompanamiento_id: acompanamientoId || null,
      acompanamiento_nombre: acompSeleccionado?.nombre,
      acompanamientos: producto.acompanamientos,
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={producto.nombre}
      description={producto.descripcion}
      size="md"
      footer={
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-coffee-500">Subtotal</p>
            <p className="text-lg font-bold text-coffee-900">${(producto.precio * cantidad).toFixed(2)}</p>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={stockInsuficienteProd || stockInsuficienteAcomp || faltaAcompanamiento}
            icon={Plus}
          >
            Agregar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {producto.imagen_url && (
          <img src={producto.imagen_url} alt={producto.nombre} className="h-40 w-full rounded-xl object-cover" />
        )}

        <div className="flex items-center justify-between rounded-xl bg-cream-100 px-4 py-3">
          <span className="text-sm font-medium text-coffee-600">Precio unitario</span>
          <span className="text-xl font-bold text-coffee-900">${producto.precio}</span>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-coffee-700">Cantidad</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              disabled={cantidad <= 1}
              aria-label="Restar cantidad"
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-cream-300 text-coffee-700 transition-colors hover:bg-cream-100 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-lg font-bold text-coffee-900">{cantidad}</span>
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.min(stockRealProducto, c + 1))}
              disabled={cantidad >= stockRealProducto}
              aria-label="Sumar cantidad"
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-cream-300 text-coffee-700 transition-colors hover:bg-cream-100 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>

            <span className={`ml-2 text-sm font-medium ${stockRealProducto < 5 ? 'text-warning-600' : 'text-coffee-500'}`}>
              {stockRealProducto <= 0 ? 'Sin stock' : `Disponibles: ${stockRealProducto}`}
              {enCarritoPrincipal + enCarritoComoAcomp > 0 && (
                <span className="ml-1 opacity-70">({enCarritoPrincipal + enCarritoComoAcomp} en carrito)</span>
              )}
            </span>
          </div>
        </div>

        {opcionesDisponibles.length > 0 && (
          <div>
            <Select
              label="Acompañamiento (obligatorio)"
              required
              value={acompanamientoId}
              onChange={(e) => setAcompanamientoId(e.target.value)}
              error={faltaAcompanamiento ? 'Debés seleccionar un acompañamiento para continuar' : undefined}
            >
              <option value="">-- Seleccioná un acompañamiento --</option>
              {opcionesDisponibles.map((op) => {
                const stockDisp = stockPorAcomp[op.id] ?? 0;
                return (
                  <option key={op.id} value={op.id} disabled={stockDisp < cantidad}>
                    {op.nombre} {op.categoria ? `(${op.categoria})` : ''} — Stock: {stockDisp}
                  </option>
                );
              })}
            </Select>
            {acompSeleccionado && !stockInsuficienteAcomp && (
              <p className="mt-1.5 text-xs font-medium text-success-600">Stock suficiente ({stockRealAcomp} disponibles)</p>
            )}
            {stockInsuficienteAcomp && (
              <Badge variant="danger" size="sm" className="mt-1.5 normal-case tracking-normal">
                Solo quedan {stockRealAcomp}
              </Badge>
            )}
          </div>
        )}

        <Textarea
          label="Notas especiales"
          placeholder='Ej: "Sin azúcar", "Tibio", etc.'
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          maxLength={200}
        />
      </div>
    </Modal>
  );
}
