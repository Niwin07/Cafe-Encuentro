const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_URL) {
  const cloudinaryUrl = new URL(process.env.CLOUDINARY_URL);
  cloudinary.config({
    cloud_name: cloudinaryUrl.hostname,
    api_key: decodeURIComponent(cloudinaryUrl.username),
    api_secret: decodeURIComponent(cloudinaryUrl.password),
    secure: true
  });
} else {
  console.error('CLOUDINARY_URL no está definida en las variables de entorno del proceso');
}

const ESTILO_FOTO = 'fotografía profesional de comida para menú de café, apetitosa, bien iluminada, fondo neutro, alta calidad, sin texto, sin logos, sin personas';

/**
 * Genera una imagen con Pollinations.ai (gratuito) a partir de un prompt,
 * opcionalmente guiada por una imagen de referencia, y la sube a Cloudinary
 * para que quede alojada de forma permanente (Pollinations no garantiza
 * persistencia ni disponibilidad de la URL a largo plazo).
 */
const generarYGuardarImagen = async ({ productoId, nombre, descripcion, imagenReferenciaUrl }) => {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL no está configurada en las variables de entorno del servidor');
  }

  const promptBase = [nombre, descripcion].filter(Boolean).join(', ');
  const prompt = `${promptBase}, ${ESTILO_FOTO}`;

  const params = new URLSearchParams({
    width: '800',
    height: '800',
    nologo: 'true',
    seed: String(Date.now())
  });

  if (imagenReferenciaUrl) {
    // El modelo "kontext" soporta imagen de referencia vía el parámetro "image"
    params.set('model', 'kontext');
    params.set('image', imagenReferenciaUrl);
  } else {
    params.set('model', 'flux');
  }

  const urlPollinations = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;

  // Cloudinary descarga la imagen desde la URL y la aloja de forma permanente
  const resultado = await cloudinary.uploader.upload(urlPollinations, {
    folder: 'cafe-encuentro/productos',
    public_id: `producto_${productoId}`,
    overwrite: true
  });

  return resultado.secure_url;
};

module.exports = { generarYGuardarImagen };
