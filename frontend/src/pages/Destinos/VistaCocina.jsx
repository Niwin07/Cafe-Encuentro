import { ChefHat } from 'lucide-react';
import TableroDestino from './TableroDestino';

export default function VistaCocina() {
  return (
    <TableroDestino
      titulo="Cocina"
      subtitulo="Gestión en tiempo real"
      icono={ChefHat}
      endpoint="/pedidos/cocina/activos"
      flujoEstados={['Pendiente', 'Listo']}
      statLabel="Platos"
      vacioTitulo="¡Todo listo!"
      vacioDescripcion="No hay pedidos pendientes en este momento."
    />
  );
}
