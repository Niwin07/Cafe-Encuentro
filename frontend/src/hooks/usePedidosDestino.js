import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const INTERVALO_MS = 5000;

/**
 * Polling de items activos de un destino (cocina / cafetería) con aviso sonoro.
 * Antes este código estaba copiado en VistaCocina y VistaCafeteria.
 *
 * - El aviso suena cuando aparece un item con un ID no visto antes. Antes se
 *   comparaba el TOTAL de items: si en el mismo ciclo se entregaba uno y
 *   entraba otro, el total no cambiaba y no sonaba.
 * - No dispara un request nuevo mientras el anterior sigue en curso.
 * - No actualiza estado después de desmontar el componente.
 */
export default function usePedidosDestino(endpoint) {
  const [pedidos, setPedidos] = useState({});
  const [ultimoUpdate, setUltimoUpdate] = useState(new Date());
  const [permisoSonido, setPermisoSonido] = useState(false);

  const audioRef = useRef(null);
  const permisoSonidoRef = useRef(false);
  const idsVistosRef = useRef(null); // null = todavía no hubo carga inicial
  const cargandoRef = useRef(false);
  const montadoRef = useRef(true);

  const cargarPedidos = useCallback(async () => {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    try {
      const res = await api.get(endpoint);
      if (!montadoRef.current) return;
      const nuevosItems = res.data.items || {};

      const idsActuales = new Set(Object.values(nuevosItems).flat().map(item => item.id));
      const hayNuevos = idsVistosRef.current !== null &&
        [...idsActuales].some(id => !idsVistosRef.current.has(id));
      idsVistosRef.current = idsActuales;

      if (hayNuevos && permisoSonidoRef.current && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error('Error de audio:', e));
        if (navigator.vibrate) navigator.vibrate(200);
      }

      setPedidos(nuevosItems);
      setUltimoUpdate(new Date());
    } catch (error) {
      console.error(`Error cargando ${endpoint}:`, error);
    } finally {
      cargandoRef.current = false;
    }
  }, [endpoint]);

  useEffect(() => {
    audioRef.current = new Audio('/ding.wav');
    audioRef.current.volume = 1.0;
    audioRef.current.load();
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    const primera = setTimeout(cargarPedidos, 0);
    const intervalo = setInterval(cargarPedidos, INTERVALO_MS);
    return () => {
      montadoRef.current = false;
      clearTimeout(primera);
      clearInterval(intervalo);
    };
  }, [cargarPedidos]);

  // Los navegadores exigen una interacción del usuario antes de reproducir audio
  const activarSonido = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play()
      .then(() => {
        setPermisoSonido(true);
        permisoSonidoRef.current = true;
      })
      .catch(e => {
        console.error(e);
        alert('No se pudo reproducir el audio de aviso.');
      });
  }, []);

  return { pedidos, ultimoUpdate, permisoSonido, activarSonido, recargar: cargarPedidos };
}
