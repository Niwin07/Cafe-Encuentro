const cloudinary = require('cloudinary').v2;
const { errorNegocio } = require('../utils/db');

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

// La función serverless tiene 60 s (frontend/vercel.json): los tiempos de
// espera suman menos para poder responder un error legible.
const TIMEOUT_HF_MS = 12000;
const TIMEOUT_POLLINATIONS_MS = 40000;

/**
 * Traduce texto al inglés con una API gratuita (el modelo de imágenes
 * responde mucho mejor en inglés que en español). Si falla, devuelve el
 * texto original para no bloquear la generación de la imagen.
 */
const traducirAIngles = async (texto) => {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=es|en`;
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await respuesta.json();
    return data?.responseData?.translatedText || texto;
  } catch {
    return texto;
  }
};

/** Lee la respuesta como imagen; falla si el servidor devolvió otra cosa (JSON de error, HTML). */
const leerImagen = async (respuesta, proveedor) => {
  const tipo = (respuesta.headers.get('content-type') || '').split(';')[0].trim();
  if (!respuesta.ok || !tipo.startsWith('image/')) {
    const detalle = (await respuesta.text().catch(() => '')).slice(0, 300);
    const error = new Error(`${proveedor} respondió ${respuesta.status}: ${detalle}`);
    error.statusProveedor = respuesta.status;
    throw error;
  }
  return { buffer: Buffer.from(await respuesta.arrayBuffer()), tipo };
};

// -----------------------------------------------------------------------------
// Hugging Face (requiere HF_TOKEN y créditos; el gratuito mensual se agota)
// -----------------------------------------------------------------------------
const HF_MODEL = 'stabilityai/stable-diffusion-3-medium-diffusers';
// Si HF respondió "sin créditos" (402), no se reintenta en esta instancia:
// cada intento solo suma demora antes de pasar a Pollinations.
let hfSinCreditos = false;

const generarImagenHF = async (prompt) => {
  const respuesta = await fetch(`https://router.huggingface.co/hf-inference/models/${HF_MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: prompt }),
    signal: AbortSignal.timeout(TIMEOUT_HF_MS)
  });
  try {
    return await leerImagen(respuesta, 'Hugging Face');
  } catch (error) {
    if (error.statusProveedor === 402) hfSinCreditos = true;
    throw error;
  }
};

// -----------------------------------------------------------------------------
// Pollinations (gratuito). API actual: gen.pollinations.ai/image/{prompt}.
// Con POLLINATIONS_KEY (clave gratuita de enter.pollinations.ai) se autentica;
// sin clave se intenta en modo anónimo y, si lo rechaza, el endpoint anterior.
// -----------------------------------------------------------------------------
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || 'black-forest-labs/flux.1-schnell';

const generarImagenPollinations = async (prompt) => {
  const texto = encodeURIComponent(prompt.slice(0, 900));
  const seed = Math.floor(Math.random() * 2147483647);
  const clave = process.env.POLLINATIONS_KEY;

  const intentos = [{
    url: `https://gen.pollinations.ai/image/${texto}?model=${encodeURIComponent(POLLINATIONS_MODEL)}&width=1024&height=1024&seed=${seed}`,
    headers: clave ? { Authorization: `Bearer ${clave}` } : {}
  }];
  if (!clave) {
    intentos.push({ url: `https://image.pollinations.ai/prompt/${texto}?width=1024&height=1024&seed=${seed}&nologo=true`, headers: {} });
  }

  const inicio = Date.now();
  let ultimoError;
  for (const intento of intentos) {
    const restante = TIMEOUT_POLLINATIONS_MS - (Date.now() - inicio);
    if (restante < 5000) break;
    try {
      const respuesta = await fetch(intento.url, { headers: intento.headers, signal: AbortSignal.timeout(restante) });
      return await leerImagen(respuesta, 'Pollinations');
    } catch (error) {
      ultimoError = error;
      console.error('⚠️ Pollinations falló:', error.message);
    }
  }
  throw ultimoError || new Error('Pollinations no respondió a tiempo');
};

/**
 * Genera la imagen probando los proveedores en orden y devuelve el primero
 * que funcione: Hugging Face (si hay HF_TOKEN y créditos) → Pollinations.
 */
const generarImagen = async (prompt) => {
  const errores = [];

  if (process.env.HF_TOKEN && !hfSinCreditos) {
    try {
      return await generarImagenHF(prompt);
    } catch (error) {
      console.error('⚠️ Hugging Face falló, se usa Pollinations:', error.message);
      errores.push(error);
    }
  }

  try {
    return await generarImagenPollinations(prompt);
  } catch (error) {
    errores.push(error);
  }

  const pidioClave = errores.some(e => [401, 402, 403].includes(e.statusProveedor));
  const mensaje = !process.env.POLLINATIONS_KEY && pidioClave
    ? 'El generador de imágenes gratuito pide una clave: creala gratis en enter.pollinations.ai y cargala en Vercel como POLLINATIONS_KEY.'
    : 'No se pudo generar la imagen en este momento (los servicios de IA no respondieron). Probá de nuevo en unos minutos.';
  throw errorNegocio(503, mensaje, 'Generador de imágenes no disponible');
};

/**
 * Genera una imagen a partir del nombre/descripción y la sube a Cloudinary
 * para que quede alojada de forma permanente.
 */
const generarYGuardarImagen = async ({ productoId, nombre, descripcion }) => {
  if (!cloudinary.config().api_key) {
    throw errorNegocio(503, 'Cloudinary no está configurado (revisar CLOUDINARY_URL en Vercel).', 'Imágenes no disponibles');
  }

  const promptBaseEs = [nombre, descripcion].filter(Boolean).join(', ');
  const promptBase = await traducirAIngles(promptBaseEs);
  const prompt = `${promptBase}, ${ESTILO_FOTO}`;

  const { buffer, tipo } = await generarImagen(prompt);

  const resultado = await cloudinary.uploader.upload(`data:${tipo};base64,${buffer.toString('base64')}`, {
    folder: 'cafe-encuentro/productos',
    public_id: `producto_${productoId}`,
    overwrite: true,
    invalidate: true   // purga la caché del CDN al sobreescribir (si no, se sigue viendo la imagen vieja)
  });

  return resultado.secure_url;
};

module.exports = { generarYGuardarImagen };
