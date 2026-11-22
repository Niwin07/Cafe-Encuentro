import { ArrowLeftRight, Banknote, CreditCard } from 'lucide-react';

// Deben coincidir con METODOS_PAGO del backend (backend/api/utils/constants.js)
export const METODOS_PAGO = [
  { value: 'Efectivo', label: 'Efectivo', icon: Banknote, badge: 'success' },
  { value: 'Transferencia', label: 'Transferencia', icon: ArrowLeftRight, badge: 'info' },
  { value: 'Tarjeta', label: 'Tarjeta', icon: CreditCard, badge: 'gold' },
];

export const infoMetodoPago = (valor) => METODOS_PAGO.find((m) => m.value === valor);
