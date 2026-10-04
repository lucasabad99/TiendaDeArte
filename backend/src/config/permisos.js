// Única fuente de verdad de roles y permisos (ver docs/ARQUITECTURA.md, sección 5b).
// Las rutas chequean PERMISOS, nunca nombres de rol: para sumar un rol alcanza con agregarlo acá.

const ROLES = ['superadmin', 'owner', 'manager', 'editor', 'customer'];

const PERMISOS = {
  superadmin: ['*'],
  owner: [
    'products:write', 'products:price', 'products:delete',
    'orders:read', 'orders:update',
    'users:read', 'users:assignRole',
    'settings:store',
  ],
  manager: ['products:write', 'products:price', 'products:delete', 'orders:read', 'orders:update'],
  editor: ['products:write'],
  customer: ['orders:own'],
};

// Qué roles puede otorgar cada rol. El superadmin NUNCA se otorga por la API: solo por el seed.
const ASIGNABLES = {
  superadmin: ['owner', 'manager', 'editor', 'customer'],
  owner: ['manager', 'editor', 'customer'],
};

function tienePermiso(role, permiso) {
  const lista = PERMISOS[role] || [];
  return lista.includes('*') || lista.includes(permiso);
}

// actor puede pasar a target al rol nuevo si ambos roles (el actual y el nuevo) están entre los que puede asignar.
// Así un owner no puede tocar a otro owner ni al superadmin.
function puedeAsignar(actorRole, targetRoleActual, rolNuevo) {
  const asignables = ASIGNABLES[actorRole] || [];
  return asignables.includes(targetRoleActual) && asignables.includes(rolNuevo);
}

// Lo que el front necesita saber para mostrar u ocultar secciones y botones.
// La seguridad real sigue estando en el back: cada ruta vuelve a chequear el permiso.
function accesoDe(role) {
  return { permisos: PERMISOS[role] || [], rolesAsignables: ASIGNABLES[role] || [] };
}

module.exports = { ROLES, PERMISOS, tienePermiso, puedeAsignar, accesoDe };
