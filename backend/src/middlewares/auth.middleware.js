const User = require('../models/User.model');
const { verificarToken } = require('../utils/jwt.util');
const { tienePermiso } = require('../config/permisos');

function leerToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.authToken || null;
}

// Exige un JWT válido. El rol se lee de la base (no del token) para que un cambio de rol
// o una baja tengan efecto inmediato, sin esperar a que venza el token.
async function authJwt(req, res, next) {
  const token = leerToken(req);
  if (!token) {
    return res.status(401).json({ status: 'error', code: 401, message: 'No autenticado.' });
  }
  try {
    const { userId } = verificarToken(token);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Usuario inexistente.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ status: 'error', code: 401, message: 'Token inválido o vencido.' });
  }
}

// Para rutas públicas que se comportan distinto si hay sesión (ej. comprar con o sin cuenta).
// Un token inválido o vencido no corta el request: se sigue como invitado.
async function authOpcional(req, res, next) {
  const token = leerToken(req);
  if (!token) return next();
  try {
    const { userId } = verificarToken(token);
    req.user = (await User.findById(userId)) || undefined;
  } catch {
    req.user = undefined;
  }
  next();
}

// Uso: router.post('/', authJwt, can('products:write'), controller)
function can(permiso) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ status: 'error', code: 401, message: 'No autenticado.' });
    }
    if (!tienePermiso(req.user.role, permiso)) {
      return res.status(403).json({ status: 'error', code: 403, message: `Acceso denegado. Falta el permiso '${permiso}'.` });
    }
    next();
  };
}

module.exports = { authJwt, authOpcional, can };
