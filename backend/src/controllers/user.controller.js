const mongoose = require('mongoose');
const User = require('../models/User.model');
const { ROLES, puedeAsignar } = require('../config/permisos');

async function listar(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json({ status: 'success', code: 200, data: users });
  } catch (err) {
    next(err);
  }
}

// PATCH /users/:id/role  { "role": "manager" }
// Reglas (config/permisos.js): owner asigna manager/editor/customer; superadmin además owner.
// Nadie otorga superadmin por acá ni se cambia el rol a sí mismo.
async function cambiarRol(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!ROLES.includes(role)) {
      return res.status(400).json({ status: 'error', code: 400, message: `Rol inválido. Opciones: ${ROLES.join(', ')}` });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ status: 'error', code: 404, message: 'Usuario no encontrado' });
    }
    if (id === req.user._id.toString()) {
      return res.status(403).json({ status: 'error', code: 403, message: 'No podés cambiar tu propio rol' });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ status: 'error', code: 404, message: 'Usuario no encontrado' });
    }
    if (!puedeAsignar(req.user.role, target.role, role)) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: `Un ${req.user.role} no puede pasar a un ${target.role} a ${role}`,
      });
    }

    target.role = role;
    await target.save();
    return res.status(200).json({ status: 'success', code: 200, message: 'Rol actualizado', data: target });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, cambiarRol };
