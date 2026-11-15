import { Coffee } from 'lucide-react';
import TableroDestino from './TableroDestino';

export default function VistaCafeteria() {
  return (
    <TableroDestino
      titulo="Cafetería - Pedidos activos"
      subtitulo="Preparando las mejores bebidas"
      icono={Coffee}
      endpoint="/pedidos/cafeteria/activos"
      flujoEstados={['Pendiente', 'En Preparación', 'Listo']}
      statLabel="Bebidas"
      vacioTitulo="¡Momento de descanso!"
      vacioDescripcion="No hay pedidos pendientes en este momento."
    />
  );
}
