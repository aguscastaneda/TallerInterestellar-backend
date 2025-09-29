const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { CAR_STATUS, SERVICE_REQUEST_STATUS } = require('../constants');
const emailService = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/car-states/transition - Cambiar estado de un auto
router.post('/transition', async (req, res) => {
  try {
    const { carId, newStatusId, description } = req.body;

    if (!carId || !newStatusId) {
      return res.status(400).json({
        success: false,
        message: 'carId y newStatusId son requeridos'
      });
    }

    // Verificar que el auto existe
    const car = await prisma.car.findUnique({
      where: { id: parseInt(carId) },
      include: {
        status: true,
        client: {
          include: {
            user: true
          }
        }
      }
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Auto no encontrado'
      });
    }

    // Verificar que el nuevo estado existe
    const newStatus = await prisma.carStatus.findUnique({
      where: { id: parseInt(newStatusId) }
    });

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido'
      });
    }

    // Actualizar el estado del auto
    const updatedCar = await prisma.car.update({
      where: { id: parseInt(carId) },
      data: { 
        statusId: parseInt(newStatusId),
        description: description || car.description
      },
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
      await emailService.sendCarStateChangeNotification(updatedCar, car.status);
    } catch (emailError) {
      console.error('Error sending state change email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: `Estado cambiado a ${newStatus.name}`,
      data: updatedCar
    });

  } catch (error) {
    console.error('Error al cambiar estado del auto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/car-states/statuses - Obtener todos los estados disponibles
router.get('/statuses', async (req, res) => {
  try {
    const statuses = await prisma.carStatus.findMany({
      orderBy: { id: 'asc' }
    });

    res.json({
      success: true,
      data: statuses
    });
  } catch (error) {
    console.error('Error al obtener estados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/car-states/accept-budget - Aceptar presupuesto (cliente)
router.post('/accept-budget', async (req, res) => {
  try {
    const { carId } = req.body;

    if (!carId) {
      return res.status(400).json({
        success: false,
        message: 'carId es requerido'
      });
    }

    // Find the service request associated with this car that has PRESUPUESTO_ENVIADO status and is assigned to a mechanic
    const serviceRequest = await prisma.serviceRequest.findFirst({
      where: { 
        carId: parseInt(carId),
        status: SERVICE_REQUEST_STATUS.PRESUPUESTO_ENVIADO,
        assignedMechanicId: {
          not: null
        }
      },
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
        }
      }
    });

    if (!serviceRequest) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró una solicitud de servicio con presupuesto enviado asignada a un mecánico para este vehículo'
      });
    }

    // Update the service request status to IN_REPAIR
    const updatedServiceRequest = await prisma.serviceRequest.update({
      where: { id: serviceRequest.id },
      data: { status: SERVICE_REQUEST_STATUS.IN_REPAIR }
    });

    // Cambiar estado a "En reparacion"
    const updatedCar = await prisma.car.update({
      where: { id: parseInt(carId) },
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
      await emailService.sendCarStateChangeNotification(updatedCar);
    } catch (emailError) {
      console.error('Error sending budget accepted email:', emailError);
    }

    res.json({
      success: true,
      message: 'Presupuesto aceptado, auto en reparación',
      data: { car: updatedCar, serviceRequest: updatedServiceRequest }
    });

  } catch (error) {
    console.error('Error al aceptar presupuesto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/car-states/reject-budget - Rechazar presupuesto (cliente)
router.post('/reject-budget', async (req, res) => {
  try {
    const { carId } = req.body;

    if (!carId) {
      return res.status(400).json({
        success: false,
        message: 'carId es requerido'
      });
    }

    // Find the service request associated with this car that has PRESUPUESTO_ENVIADO status and is assigned to a mechanic
    const serviceRequest = await prisma.serviceRequest.findFirst({
      where: { 
        carId: parseInt(carId),
        status: SERVICE_REQUEST_STATUS.PRESUPUESTO_ENVIADO,
        assignedMechanicId: {
          not: null
        }
      }
    });

    if (!serviceRequest) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró una solicitud de servicio con presupuesto enviado asignada a un mecánico para este vehículo'
      });
    }

    // Mark it as rejected
    await prisma.serviceRequest.update({
      where: { id: serviceRequest.id },
      data: { status: SERVICE_REQUEST_STATUS.REJECTED }
    });

    // Cambiar estado a "Rechazado" y luego a "Entrada"
    await prisma.car.update({
      where: { id: parseInt(carId) },
      data: { statusId: CAR_STATUS.RECHAZADO }
    });

    const updatedCar = await prisma.car.update({
      where: { id: parseInt(carId) },
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
      console.error('Error sending budget rejected email:', emailError);
    }

    res.json({
      success: true,
      message: 'Presupuesto rechazado, auto vuelve a entrada',
      data: updatedCar
    });

  } catch (error) {
    console.error('Error al rechazar presupuesto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/car-states/finish-repair - Finalizar reparación (mecánico)
router.post('/finish-repair', async (req, res) => {
  try {
    const { carId, finalDescription, finalCost } = req.body;

    if (!carId || !finalDescription || !finalCost) {
      return res.status(400).json({
        success: false,
        message: 'carId, finalDescription y finalCost son requeridos'
      });
    }

    // Crear registro de reparación
    const repair = await prisma.repair.create({
      data: {
        carId: parseInt(carId),
        mechanicId: 1, // TODO: Obtener del token de autenticación
        description: finalDescription,
        cost: parseFloat(finalCost),
        warranty: 90
      }
    });

    // Cambiar estado a "Finalizado"
    const updatedCar = await prisma.car.update({
      where: { id: parseInt(carId) },
      data: { statusId: CAR_STATUS.FINALIZADO },
      include: {
        status: true,
        repairs: true,
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
      console.error('Error sending repair finished email:', emailError);
    }

    res.json({
      success: true,
      message: 'Reparación finalizada',
      data: updatedCar
    });

  } catch (error) {
    console.error('Error al finalizar reparación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/car-states/deliver-car - Entregar auto (recepcionista)
router.post('/deliver-car', async (req, res) => {
  try {
    const { carId } = req.body;

    if (!carId) {
      return res.status(400).json({
        success: false,
        message: 'carId es requerido'
      });
    }

    // Cambiar estado a "Entregado" y luego a "Entrada"
    await prisma.car.update({
      where: { id: parseInt(carId) },
      data: { statusId: CAR_STATUS.ENTREGADO }
    });

    const updatedCar = await prisma.car.update({
      where: { id: parseInt(carId) },
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

    // Send email notification for delivery
    try {
      await emailService.sendCarStateChangeNotification(updatedCar);
    } catch (emailError) {
      console.error('Error sending car delivered email:', emailError);
    }

    res.json({
      success: true,
      message: 'Auto entregado exitosamente',
      data: updatedCar
    });

  } catch (error) {
    console.error('Error al entregar auto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
