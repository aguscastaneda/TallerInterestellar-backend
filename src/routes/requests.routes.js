const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

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
        status: 'PENDING'
      },
      include: {
        car: true,
        client: { include: { user: { select: { id: true, name: true, lastName: true, email: true } } } },
        assignedBoss: { include: { user: { select: { id: true, name: true, lastName: true } } } },
        preferredMechanic: { include: { user: { select: { id: true, name: true, lastName: true } } } }
      }
    });

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
        car: true,
        client: { include: { user: { select: { id: true, name: true, lastName: true } } } },
        preferredMechanic: { include: { user: { select: { id: true, name: true, lastName: true } } } },
        assignedMechanic: { include: { user: { select: { id: true, name: true, lastName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: requests });
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
      data: { assignedMechanicId: mechanicId, status: 'ASSIGNED' },
      include: {
        car: true,
        client: { include: { user: { select: { id: true, name: true, lastName: true } } } },
        assignedMechanic: { include: { user: { select: { id: true, name: true, lastName: true } } } }
      }
    });
    res.json({ success: true, message: 'Solicitud asignada', data: updated });
  } catch (error) {
    console.error('Error al asignar solicitud:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// PUT /api/requests/:id/status - Actualizar estado (mecánico)
router.put('/:id/status', [
  body('status').isIn(['IN_PROGRESS', 'COMPLETED']),
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

    // Si completado, crear Repair y actualizar Car.statusId (2 FINALIZADO en tu esquema)
    let repair = null;
    if (status === 'COMPLETED' && reqDb.assignedMechanicId) {
      repair = await prisma.repair.create({
        data: {
          carId: reqDb.carId,
          mechanicId: reqDb.assignedMechanicId,
          description: description || reqDb.description,
          cost: parseFloat(cost || '0'),
          warranty: 90
        }
      });
      await prisma.car.update({ where: { id: reqDb.carId }, data: { statusId: 2 } });
    }

    res.json({ success: true, message: 'Estado actualizado', data: { request: updated, repair } });
  } catch (error) {
    console.error('Error al actualizar estado de solicitud:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

module.exports = router;
// GET /api/requests/mechanic/:mechanicId - Solicitudes por mecánico asignado
router.get('/mechanic/:mechanicId', async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const requests = await prisma.serviceRequest.findMany({
      where: { assignedMechanicId: parseInt(mechanicId) },
      include: {
        car: true,
        client: { include: { user: { select: { id: true, name: true, lastName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: requests });
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
        car: true,
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


