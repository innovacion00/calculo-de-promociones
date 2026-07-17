// Etiquetas y opciones de rol, compartidas por el shell y el módulo de Usuarios.
export const ROLE_LABELS = {
  master_admin: 'Master Admin',
  admin: 'Admin',
  revenue_manager: 'Revenue Manager',
  revenue_assistant: 'Revenue Auxiliar',
  operations: 'Operaciones',
  viewer: 'Solo Lectura',
  reservas: 'Reservas',
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
