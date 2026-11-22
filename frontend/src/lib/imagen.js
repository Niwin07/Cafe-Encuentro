/**
 * Achica una foto en el navegador antes de subirla: las fotos de celular pesan
 * varios MB y Vercel acepta como máximo 4,5 MB por request. Devuelve un data
 * URI JPEG con el lado mayor ≤ `ladoMax` px.
 */
export async function achicarImagen(archivo, { ladoMax = 1280, calidad = 0.85 } = {}) {
  if (!archivo?.type?.startsWith('image/')) {
    throw new Error('El archivo elegido no es una imagen.');
  }

  const fuente = await cargarImagen(archivo);
  const escala = Math.min(1, ladoMax / Math.max(fuente.width, fuente.height));
  const ancho = Math.round(fuente.width * escala);
  const alto = Math.round(fuente.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  // Fondo blanco: un PNG con transparencia no queda negro al pasarlo a JPEG
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(fuente, 0, 0, ancho, alto);
  if (typeof fuente.close === 'function') fuente.close();

  return canvas.toDataURL('image/jpeg', calidad);
}

async function cargarImagen(archivo) {
  // createImageBitmap respeta la orientación EXIF (fotos verticales del celular)
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    } catch {
      // algunos formatos (p. ej. HEIC en navegadores sin soporte) caen acá
    }
  }
  const url = URL.createObjectURL(archivo);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo leer la imagen. Probá con una foto JPG o PNG.'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
