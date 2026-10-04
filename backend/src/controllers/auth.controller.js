const User = require('../models/User.model');
const { firmarToken, cookieOptionsAuth } = require('../utils/jwt.util');
const { accesoDe } = require('../config/permisos');

// Registro público: SIEMPRE crea un customer. El rol que venga en el body se ignora
// (en Backend II cualquiera podía registrarse como admin mandando "role":"admin").
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Faltan campos: name, email o password' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ status: 'error', code: 400, message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const existente = await User.findOne({ email: String(email).toLowerCase() });
    if (existente) {
      return res.status(409).json({ status: 'error', code: 409, message: 'Ya existe un usuario con ese email' });
    }

    const nuevo = await User.create({ name, email, password, role: 'customer' });

    return res.status(201).json({ status: 'success', code: 201, message: 'Usuario registrado', data: { user: nuevo } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ status: 'error', code: 400, message: 'Faltan email o password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    // Mismo mensaje si no existe o si la contraseña está mal: no revelamos qué emails están registrados
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Credenciales inválidas' });
    }

    const token = firmarToken(user);
    res.cookie('authToken', token, cookieOptionsAuth());

    return res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Login exitoso',
      data: { token, user, acceso: accesoDe(user.role) },
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie('authToken', { path: '/' });
  return res.status(200).json({ status: 'success', code: 200, message: 'Sesión cerrada' });
}

function me(req, res) {
  return res.status(200).json({ status: 'success', code: 200, data: { user: req.user, acceso: accesoDe(req.user.role) } });
}

module.exports = { register, login, logout, me };
