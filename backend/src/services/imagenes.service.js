// Fotos de las obras en Cloudinary. El SDK lee la cuenta de CLOUDINARY_URL
// (cloudinary://API_KEY:API_SECRET@CLOUD_NAME). Sin esa variable, la subida queda desactivada
// y las fotos se pueden seguir cargando por link.
const { v2: cloudinary } = require('cloudinary');

const habilitado = () => Boolean(process.env.CLOUDINARY_URL);
if (habilitado()) cloudinary.config({ secure: true, analytics: false }); // analytics: sin el ?_a=… en las URLs

const CARPETA = process.env.CLOUDINARY_CARPETA || 'tienda-arte/obras';

// Guardamos una versión de hasta 2000 px (una foto de celular de 12 MP no hace falta entera)
// y devolvemos una URL de entrega optimizada: formato y calidad automáticos según el navegador
// (WebP/AVIF), ancho máximo 1600 px: la tienda nunca descarga la foto original del celular.
function subir(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CARPETA,
        resource_type: 'image',
        transformation: [{ width: 2000, height: 2000, crop: 'limit' }],
      },
      (err, r) => {
        if (err) return reject(err);
        resolve({
          publicId: r.public_id,
          url: cloudinary.url(r.public_id, {
            version: r.version,
            fetch_format: 'auto',
            quality: 'auto',
            width: 1600,
            crop: 'limit',
          }),
          ancho: r.width,
          alto: r.height,
        });
      }
    );
    stream.end(buffer);
  });
}

module.exports = { habilitado, subir };
