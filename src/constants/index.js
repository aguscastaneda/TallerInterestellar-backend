const ROLES = {
  CLIENT: 1,
  MECHANIC: 2,
  BOSS: 3,
  ADMIN: 4,
  RECEPTIONIST: 5
};


const SYSTEM_STATUS = {

  ENTRADA: 1,
  PENDIENTE: 2,
  EN_REVISION: 3,
  RECHAZADO: 4,
  EN_REPARACION: 5,
  FINALIZADO: 6,
  ENTREGADO: 7,
  CANCELADO: 8
};

const CAR_STATUS = SYSTEM_STATUS;
const REPAIR_STATUS = SYSTEM_STATUS;

const SERVICE_REQUEST_STATUS = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  PRESUPUESTO_ENVIADO: 'PRESUPUESTO_ENVIADO',
  IN_REPAIR: 'IN_REPAIR',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

const PAYMENT_STATUS = {
  PENDIENTE: 'PENDIENTE',
  PAGADO: 'PAGADO',
  CANCELADO: 'CANCELADO'
};

const PAYMENT_METHODS = {
  EFECTIVO: 'EFECTIVO',
  TARJETA: 'TARJETA',
  TRANSFERENCIA: 'TRANSFERENCIA'
};


const STATUS_TRANSLATIONS = {
  [SERVICE_REQUEST_STATUS.PENDING]: 'Pendiente',
  [SERVICE_REQUEST_STATUS.ASSIGNED]: 'Asignada',
  [SERVICE_REQUEST_STATUS.PRESUPUESTO_ENVIADO]: 'Presupuesto Enviado',
  [SERVICE_REQUEST_STATUS.IN_REPAIR]: 'En Reparación',
  [SERVICE_REQUEST_STATUS.REJECTED]: 'Rechazado',
  [SERVICE_REQUEST_STATUS.COMPLETED]: 'Completada',
  [SERVICE_REQUEST_STATUS.CANCELLED]: 'Cancelada'
};


const STATUS_NAMES = {
  1: 'Entrada',
  2: 'Pendiente',
  3: 'En Revisión',
  4: 'Rechazado',
  5: 'En Reparación',
  6: 'Finalizado',
  7: 'Entregado',
  8: 'Cancelado'
};


const STATUS_COLORS = {
  1: 'bg-gray-100 text-gray-800',
  2: 'bg-yellow-100 text-yellow-800',
  3: 'bg-blue-100 text-blue-800',
  4: 'bg-red-100 text-red-800',
  5: 'bg-purple-100 text-purple-800',
  6: 'bg-green-100 text-green-800',
  7: 'bg-indigo-100 text-indigo-800',
  8: 'bg-orange-100 text-orange-800'
};

const STATUS_TAB_COLORS = {
  1: 'bg-gray-500 hover:bg-gray-600',
  2: 'bg-yellow-500 hover:bg-yellow-600',
  3: 'bg-blue-500 hover:bg-blue-600',
  4: 'bg-red-500 hover:bg-red-600',
  5: 'bg-purple-500 hover:bg-purple-600',
  6: 'bg-green-500 hover:bg-green-600',
  7: 'bg-indigo-500 hover:bg-indigo-600',
  8: 'bg-orange-500 hover:bg-orange-600'
};

module.exports = {
  ROLES,
  SYSTEM_STATUS,
  CAR_STATUS,
  REPAIR_STATUS,
  SERVICE_REQUEST_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  STATUS_TRANSLATIONS,
  STATUS_NAMES,
  STATUS_COLORS,
  STATUS_TAB_COLORS
};