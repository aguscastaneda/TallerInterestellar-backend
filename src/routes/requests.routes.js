const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { CAR_STATUS, SERVICE_REQUEST_STATUS } = require('../constants');
const emailService = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
  }
  next();
};

// POST /api/requests - Cliente crea solicitud de mecánico
router.post('/', [
  body('carId').isInt({ min: 1 }),
  body('clientId').isInt({ min: 1 }),
  body('description').notEmpty().trim(),
  body('preferredMechanicId').optional().isInt({ min: 1 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { carId, clientId, description, preferredMechanicId } = req.body;

    // Validaciones básicas
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car || car.clientId !== clientId) {
      return res.status(400).json({ success: false, message: 'Auto inválido para el cliente' });
    }

    let assignedBossId = null;
    if (preferredMechanicId) {
      const mech = await prisma.mechanic.findUnique({ where: { id: preferredMechanicId } });
      if (!mech) return res.status(400).json({ success: false, message: 'Mecánico preferido no encontrado' });
      assignedBossId = mech.bossId || null;
    } else {
      // Elegir jefe aleatorio
      const bosses = await prisma.boss.findMany();
      if (bosses.length === 0) return res.status(400).json({ success: false, message: 'No hay jefes disponibles' });
      assignedBossId = bosses[Math.floor(Math.random() * bosses.length)].id;
    }

    const request = await prisma.serviceRequest.create({
      data: {
        carId,
        clientId,
        description,
        preferredMechanicId: preferredMechanicId || null,
        assignedBossId,
        status: SERVICE_REQUEST_STATUS.PENDING
      },
      include: {
        car: { include: { status: true } },
        client: { include: { user: { select: { id: true, name: true, lastName: true, email: true } } } },
        assignedBoss: { include: { user: { select: { id: true, name: true, lastName: true } } } },
        preferredMechanic: { include: { user: { select: { id: true, name: true, lastName: true } } } }
      }
    });

    // Actualizar estado del auto a "pendiente"
    const updatedCar = await prisma.car.update({ 
      where: { id: carId }, 
      data: { statusId: CAR_STATUS.PENDIENTE },
      include: {
        status: true,
        client: {
          include: {
            user: true
          }
        }
      }
    });

    // Send email notification
    try {
      await emailService.sendCarStateChangeNotification(updatedCar);
    } catch (emailError) {
      console.error('Error sending car state change email:', emailError);
    }

    return res.status(201).json({ success: true, message: 'Solicitud creada', data: request });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/requests/boss/:bossId - Solicitudes asignadas a un jefe
router.get('/boss/:bossId', async (req, res) => {
  try {
    const { bossId } = req.params;
    const requests = await prisma.serviceRequest.findMany({
      where: { assignedBossId: parseInt(bossId) },
      include: {
        car: { include: { status: true } },
        client: { include: { user: { select: { id: true, name: true, lastName: true } } } },
        preferredMechanic: { include: { user: { select: { id: true, name: true, lastName: true } } } },
        assignedMechanic: { include: { user: { select: { id: true, name: true, lastName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Para las solicitudes completadas, buscar información de reparación
    const requestsWithRepairs = await Promise.all(
      requests.map(async (request) => {
        if (request.status === SERVICE_REQUEST_STATUS.COMPLETED) {
          const repair = await prisma.repair.findFirst({
            where: {
              carId: request.carId,
              mechanicId: request.assignedMechanicId
            },
            orderBy: { createdAt: 'desc' }
          });
          return { ...request, repair };
        }
        return request;
      })
    );

    res.json({ success: true, data: requestsWithRepairs });
  } catch (error) {
    console.error('Error al listar solicitudes del jefe:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// PUT /api/requests/:id/assign - Jefe asigna mecánico
router.put('/:id/assign', [
  body('mechanicId').isInt({ min: 1 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const { mechanicId } = req.body;

    const reqDb = await prisma.serviceRequest.findUnique({ where: { id: parseInt(id) }, include: { assignedBoss: true } });
    if (!reqDb) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

    const mech = await prisma.mechanic.findUnique({ where: { id: mechanicId } });
    if (!mech) return res.status(400).json({ success: false, message: 'Mecánico no válido' });

    const updated = await prisma.serviceRequest.update({
      where: { id: parseInt(id) },
      data: { assignedMechanicId: mechanicId, status: SERVICE_REQUEST_STATUS.ASSIGNED },
      include: {
        car: { include: { status: true } },
        client: { include: { user: { select: { id: true, name: true, lastName: true } } } },
        assignedMechanic: { include: { user: { select: { id: true, name: true, lastName: true } } } }
      }
    });

    // Cambiar estado del auto a "en revision"
    const updatedCarForRevision = await prisma.car.update({ 
      where: { id: updated.carId }, 
      data: { statusId: CAR_STATUS.EN_REVISION },
      include: {
        status: true,
        client: {
          include: {
            user: true
          }
        },
        mechanic: {
          include: {
            user: true
          }
        }
      }
    });

    // Send email notification
    try {
      await emailService.sendCarStateChangeNotification(updatedCarForRevision);
    } catch (emailError) {
      console.error('Error sending mechanic assignment email:', emailError);
    }
    res.json({ success: true, message: 'Solicitud asignada', data: updated });
  } catch (error) {
    console.error('Error al asignar solicitud:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// PUT /api/requests/:id/status - Actualizar estado (mecánico)
router.put('/:id/status', [
  body('status').isIn([SERVICE_REQUEST_STATUS.IN_PROGRESS, SERVICE_REQUEST_STATUS.COMPLETED]),
  body('description').optional().trim(),
  body('cost').optional().isFloat({ min: 0 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const { status, description, cost } = req.body;

    const reqDb = await prisma.serviceRequest.findUnique({ where: { id: parseInt(id) } });
    if (!reqDb) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

    const updated = await prisma.serviceRequest.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    // Actualizar estado del auto según status de la solicitud
    if (status === SERVICE_REQUEST_STATUS.IN_PROGRESS) {
      const updatedCarInProgress = await prisma.car.update({ 
        where: { id: reqDb.carId }, 
        data: { statusId: CAR_STATUS.EN_REPARACION },
        include: {
          status: true,
          client: {
            include: {
              user: true
            }
          }
        }
      });
      
      // Send email notification
      try {
        await emailService.sendCarStateChangeNotification(updatedCarInProgress);
      } catch (emailError) {
        console.error('Error sending repair in progress email:', emailError);
      }
    }

    // Si completado, crear Repair y actualizar Car.statusId
    let repair = null;
    if (status === SERVICE_REQUEST_STATUS.COMPLETED && reqDb.assignedMechanicId) {
      repair = await prisma.repair.create({
        data: {
          carId: reqDb.carId,
          mechanicId: reqDb.assignedMechanicId,
          description: description || reqDb.description,
          cost: parseFloat(cost || '0'),
          warranty: 90
        }
      });
      const finalizedCar = await prisma.car.update({ 
        where: { id: reqDb.carId }, 
        data: { statusId: CAR_STATUS.FINALIZADO },
        include: {
          status: true,
          client: {
            include: {
              user: true
            }
          },
          mechanic: {
            include: {
              user: true
            }
          }
        }
      });
      
      // Send email notification
      try {
        await emailService.sendCarStateChangeNotification(finalizedCar);
      } catch (emailError) {
        console.error('Error sending repair completed email:', emailError);
      }
    }

    res.json({ success: true, message: 'Estado actualizado', data: { request: updated, repair } });
  } catch (error) {
    console.error('Error al actualizar estado de solicitud:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// POST /api/requests/:id/budget - Create and send budget (mechanic)
router.post('/:id/budget', [
  body('description').notEmpty().trim(),
  body('cost').isFloat({ min: 0 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const { description, cost } = req.body;

    // Get the service request with all necessary data
    const request = await prisma.serviceRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        car: { 
          include: { 
            status: true,
            client: {
              include: {
                user: true
              }
            }
          } 
        },
        client: { 
          include: { 
            user: { 
              select: { 
                id: true, 
                name: true, 
                lastName: true,
                email: true
              } 
            } 
          } 
        },
        assignedMechanic: { 
          include: { 
            user: { 
              select: { 
                id: true, 
                name: true, 
                lastName: true 
              } 
            } 
          } 
        }
      }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    // Update request status to PRESUPUESTO_ENVIADO
    const updatedRequest = await prisma.serviceRequest.update({
      where: { id: parseInt(id) },
      data: { status: SERVICE_REQUEST_STATUS.PRESUPUESTO_ENVIADO }
    });

    // Update car status to PENDIENTE (waiting for client response)
    const updatedCar = await prisma.car.update({
      where: { id: request.carId },
      data: { statusId: CAR_STATUS.PENDIENTE },
      include: {
        status: true,
        client: {
          include: {
            user: true
          }
        }
      }
    });

    // Send budget email to client
    const budgetData = {
      description,
      cost: parseFloat(cost)
    };

    try {
      await emailService.sendBudgetEmail(updatedCar, budgetData);
    } catch (emailError) {
      console.error('Error sending budget email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ 
      success: true, 
      message: 'Presupuesto enviado al cliente', 
      data: { request: updatedRequest, car: updatedCar } 
    });
  } catch (error) {
    console.error('Error al enviar presupuesto:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// POST /api/requests/:id/cancel - Cancelar solicitud (cliente)
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the service request with all necessary data
    const request = await prisma.serviceRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        car: { 
          include: { 
            status: true,
            client: {
              include: {
                user: true
              }
            }
          } 
        },
        client: { 
          include: { 
            user: { 
              select: { 
                id: true, 
                name: true, 
                lastName: true,
                email: true
              } 
            } 
          } 
        }
      }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    // Update request status to CANCELLED
    const updatedRequest = await prisma.serviceRequest.update({
      where: { id: parseInt(id) },
      data: { status: SERVICE_REQUEST_STATUS.CANCELLED }
    });

    // Update car status to CANCELADO y entonces a ENTRADA
    await prisma.car.update({
      where: { id: request.carId },
      data: { statusId: CAR_STATUS.CANCELADO }
    });

    const updatedCar = await prisma.car.update({
      where: { id: request.carId },
      data: { statusId: CAR_STATUS.ENTRADA },
      include: {
        status: true,
        client: {
          include: {
            user: true
          }
        }
      }
    });

    // Send email notification
    try {
      await emailService.sendCarStateChangeNotification(updatedCar);
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ 
      success: true, 
      message: 'Solicitud cancelada exitosamente', 
      data: { request: updatedRequest, car: updatedCar } 
    });
  } catch (error) {
    console.error('Error al cancelar solicitud:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/requests/mechanic/:mechanicId - Solicitudes por mecánico asignado
router.get('/mechanic/:mechanicId', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const requests = await prisma.serviceRequest.findMany({
      where: { assignedMechanicId: parseInt(mechanicId) },
      include: {
        car: { include: { status: true } },
        client: { include: { user: { select: { id: true, name: true, lastName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Para las solicitudes completadas, buscar información de reparación
    // Todos los mecánicos pueden ver los detalles de cualquier reparación completada
    const requestsWithRepairs = await Promise.all(
      requests.map(async (request) => {
        if (request.status === SERVICE_REQUEST_STATUS.COMPLETED) {
          const repair = await prisma.repair.findFirst({
            where: {
              carId: request.carId
              // Remover filtro por mechanicId para que todos los mecánicos vean los detalles
            },
            orderBy: { createdAt: 'desc' }
          });
          return { ...request, repair };
        }
        return request;
      })
    );

    res.json({ success: true, data: requestsWithRepairs });
  } catch (error) {
    console.error('Error al listar solicitudes del mecánico:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/requests/client/:clientId - Historial de solicitudes por cliente
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const requests = await prisma.serviceRequest.findMany({
      where: { clientId: parseInt(clientId) },
      include: {
        car: { include: { status: true } },
        assignedMechanic: { include: { user: { select: { id: true, name: true, lastName: true } } } },
        assignedBoss: { include: { user: { select: { id: true, name: true, lastName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error al listar solicitudes del cliente:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

module.exports = router;