const cloudinary = require('cloudinary').v2;

// Nunca debe tirar al cargar el módulo: un CLOUDINARY_URL mal configurado
// no puede tumbar rutas que no tienen nada que ver con imágenes (login, etc.).
try {
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
} catch (error) {
  console.error('CLOUDINARY_URL está mal formada:', error.message);
}

const ESTILO_FOTO = 'professional product photography, appetizing, single item centered on a plain background, studio lighting, high detail, no text, no watermark, no logo, no people';

/**
 * Traduce texto al inglés con una API gratuita (el modelo de imágenes
 * responde mucho mejor en inglés que en español). Si falla, devuelve el
 * texto original para no bloquear la generación de la imagen.
 */
const traducirAIngles = async (texto) => {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=es|en`;
    const respuesta = await fetch(url);
    const data = await respuesta.json();
    return data?.responseData?.translatedText || texto;
  } catch {
    return texto;
  }
};

/**
 * Genera una imagen con Pollinations.ai (gratuito) a partir de un prompt
 * y la sube a Cloudinary para que quede alojada de forma permanente
 * (Pollinations no garantiza persistencia ni disponibilidad de la URL
 * a largo plazo).
 */
const generarYGuardarImagen = async ({ productoId, nombre, descripcion }) => {
  if (!cloudinary.config().api_key) {
    throw new Error('Cloudinary no está configurado correctamente (revisar CLOUDINARY_URL en las variables de entorno)');
  }

  const promptBaseEs = [nombre, descripcion].filter(Boolean).join(', ');
  const promptBase = await traducirAIngles(promptBaseEs);
  const prompt = `${promptBase}, ${ESTILO_FOTO}`;

  const params = new URLSearchParams({
    width: '800',
    height: '800',
    nologo: 'true',
    model: 'flux',
    seed: String(Math.floor(Math.random() * 2147483647))
  });

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
