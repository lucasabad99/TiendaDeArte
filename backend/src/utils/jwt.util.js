const jwt = require('jsonwebtoken');
const env = require('../config/env');

function firmarToken(user) {
  return jwt.sign({ userId: user._id.toString(), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function verificarToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

function cookieOptionsAuth() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  };
}

module.exports = { firmarToken, verificarToken, cookieOptionsAuth };
