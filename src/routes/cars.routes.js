const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware para validar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array()
    });
  }
  next();
};

// GET /api/cars - Obtener todos los autos
router.get('/', async (req, res) => {
  try {
    const cars = await prisma.car.findMany({
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                phone: true,
                cuil: true,
                createdAt: true
              }
            }
          }
        },
        mechanic: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true
              }
            }
          }
        },
        status: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({
      success: true,
      data: cars
    });
  } catch (error) {
    console.error('Error al obtener autos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/cars/plate/:licensePlate - Buscar por patente exacta
router.get('/plate/:licensePlate', async (req, res) => {
  try {
    const { licensePlate } = req.params;
    const car = await prisma.car.findUnique({
      where: { licensePlate },
      include: {
        client: { include: { user: { select: { id: true, name: true, lastName: true, email: true, phone: true, cuil: true, createdAt: true } } } },
        mechanic: { include: { user: { select: { id: true, name: true, lastName: true } } } },
        status: true
      }
    });

    if (!car) {
      return res.status(404).json({ success: false, message: 'Patente inexistente' });
    }

    res.json({ success: true, data: car });
  } catch (error) {
    console.error('Error al buscar por patente:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/cars/client/:clientId - Autos por cliente
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const cars = await prisma.car.findMany({
      where: { clientId: parseInt(clientId) },
      include: {
        status: true,
        mechanic: { include: { user: { select: { id: true, name: true, lastName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: cars });
  } catch (error) {
    console.error('Error al obtener autos del cliente:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/cars/:id - Obtener auto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const car = await prisma.car.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                phone: true,
                cuil: true,
                createdAt: true
              }
            }
          }
        },
        mechanic: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true
              }
            }
          }
        },
        status: true,
        repairs: {
          include: {
            mechanic: {
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
          },
          orderBy: {
            createdAt: 'desc'
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

    res.json({
      success: true,
      data: car
    });
  } catch (error) {
    console.error('Error al obtener auto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/cars - Crear nuevo auto
router.post('/', [
  body('clientId').isInt({ min: 1 }),
  body('licensePlate').notEmpty().trim(),
  body('brand').notEmpty().trim(),
  body('model').notEmpty().trim(),
  body('kms').optional().isInt({ min: 0 }),
  body('chassis').optional().trim(),
  body('description').optional().trim(),
  body('statusId').optional().isInt({ min: 0 }),
  body('priority').optional().isInt({ min: 1, max: 5 }),
  body('estimatedDate').optional().isISO8601(),
  handleValidationErrors
], async (req, res) => {
  try {
    const {
      clientId,
      licensePlate,
      brand,
      model,
      kms,
      chassis,
      description,
      statusId = 1,
      priority = 1,
      estimatedDate
    } = req.body;

    // Verificar si el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(400).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Verificar si la patente ya existe
    const existingCar = await prisma.car.findUnique({
      where: { licensePlate }
    });

    if (existingCar) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un auto con esa patente'
      });
    }

    // Crear el auto
    const car = await prisma.car.create({
      data: {
        clientId,
        licensePlate,
        brand,
        model,
        kms,
        chassis,
        description,
        statusId,
        priority,
        estimatedDate: estimatedDate ? new Date(estimatedDate) : null
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                phone: true,
                cuil: true,
                createdAt: true
              }
            }
          }
        },
        status: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Auto creado exitosamente',
      data: car
    });

  } catch (error) {
    console.error('Error al crear auto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/cars/:id - Actualizar auto
router.put('/:id', [
  body('licensePlate').optional().trim(),
  body('brand').optional().trim(),
  body('model').optional().trim(),
  body('kms').optional().isInt({ min: 0 }),
  body('chassis').optional().trim(),
  body('description').optional().trim(),
  body('statusId').optional().isInt({ min: 0 }),
  body('priority').optional().isInt({ min: 1, max: 5 }),
  body('estimatedDate').optional().isISO8601(),
  body('mechanicId').optional().isInt({ min: 1 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar si el auto existe
    const existingCar = await prisma.car.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingCar) {
      return res.status(404).json({
        success: false,
        message: 'Auto no encontrado'
      });
    }

    // Si se está cambiando la patente, verificar que no exista
    if (updateData.licensePlate && updateData.licensePlate !== existingCar.licensePlate) {
      const carWithSamePlate = await prisma.car.findUnique({
        where: { licensePlate: updateData.licensePlate }
      });

      if (carWithSamePlate) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un auto con esa patente'
        });
      }
    }

    // Si se está asignando un mecánico, verificar que exista
    if (updateData.mechanicId) {
      const mechanic = await prisma.mechanic.findUnique({
        where: { id: updateData.mechanicId }
      });

      if (!mechanic) {
        return res.status(400).json({
          success: false,
          message: 'Mecánico no encontrado'
        });
      }
    }

    // Convertir fecha si se proporciona
    if (updateData.estimatedDate) {
      updateData.estimatedDate = new Date(updateData.estimatedDate);
    }

    // Actualizar el auto
    const updatedCar = await prisma.car.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                phone: true,
                cuil: true,
                createdAt: true
              }
            }
          }
        },
        mechanic: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true
              }
            }
          }
        },
        status: true
      }
    });

    res.json({
      success: true,
      message: 'Auto actualizado exitosamente',
      data: updatedCar
    });

  } catch (error) {
    console.error('Error al actualizar auto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/cars/:id - Eliminar auto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el auto existe
    const existingCar = await prisma.car.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingCar) {
      return res.status(404).json({
        success: false,
        message: 'Auto no encontrado'
      });
    }

    // Verificar si tiene reparaciones asociadas
    const repairs = await prisma.repair.findMany({
      where: { carId: parseInt(id) }
    });

    if (repairs.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar un auto que tiene reparaciones asociadas'
      });
    }

    // Eliminar el auto
    await prisma.car.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Auto eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar auto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/cars/status/:statusId - Obtener autos por estado
router.get('/status/:statusId', async (req, res) => {
  try {
    const { statusId } = req.params;
    
    const cars = await prisma.car.findMany({
      where: { statusId: parseInt(statusId) },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                phone: true,
                cuil: true,
                createdAt: true
              }
            }
          }
        },
        mechanic: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true
              }
            }
          }
        },
        status: true
      },
      orderBy: {
        priority: 'desc',
        createdAt: 'desc'
      }
    });
    
    res.json({
      success: true,
      data: cars
    });
  } catch (error) {
    console.error('Error al obtener autos por estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
