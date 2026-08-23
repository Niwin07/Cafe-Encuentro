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

const HF_MODEL = 'stabilityai/stable-diffusion-3-medium-diffusers';

/**
 * Pide la imagen al modelo de Hugging Face (provider gratuito "hf-inference")
 * y devuelve los bytes crudos (JPEG).
 */
const generarImagenHF = async (prompt) => {
  if (!process.env.HF_TOKEN) {
    throw new Error('HF_TOKEN no está configurada en las variables de entorno del servidor');
  }

  const respuesta = await fetch(`https://router.huggingface.co/hf-inference/models/${HF_MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: prompt })
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Hugging Face respondió ${respuesta.status}: ${detalle}`);
  }

  const arrayBuffer = await respuesta.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

/**
 * Genera una imagen con Hugging Face (gratuito) a partir de un prompt
 * y la sube a Cloudinary para que quede alojada de forma permanente.
 */
const generarYGuardarImagen = async ({ productoId, nombre, descripcion }) => {
  if (!cloudinary.config().api_key) {
    throw new Error('Cloudinary no está configurado correctamente (revisar CLOUDINARY_URL en las variables de entorno)');
  }

  const promptBaseEs = [nombre, descripcion].filter(Boolean).join(', ');
  const promptBase = await traducirAIngles(promptBaseEs);
  const prompt = `${promptBase}, ${ESTILO_FOTO}`;

  const imagenBuffer = await generarImagenHF(prompt);
  const base64 = imagenBuffer.toString('base64');

  const resultado = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64}`, {
    folder: 'cafe-encuentro/productos',
    public_id: `producto_${productoId}`,
    overwrite: true,
    invalidate: true
  });

  return resultado.secure_url;
};

module.exports = { generarYGuardarImagen };
