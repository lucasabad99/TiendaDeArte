// Reglas compartidas entre formularios (contacto, checkout). Mismas que en el front.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_RE = /^[\d\s+()-]{6,20}$/;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

module.exports = { EMAIL_RE, TELEFONO_RE, texto };
