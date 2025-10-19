const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { CAR_STATUS } = require('../constants');
const emailService = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();


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


router.get('/', async (req, res) => {
  try {
    const repairs = await prisma.repair.findMany({
      include: {
        car: {
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: repairs
    });
  } catch (error) {
    console.error('Error al obtener reparaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const repair = await prisma.repair.findUnique({
      where: { id: parseInt(id) },
      include: {
        car: {
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
        payments: {
          include: {
            client: {
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

    if (!repair) {
      return res.status(404).json({
        success: false,
        message: 'Reparación no encontrada'
      });
    }

    res.json({
      success: true,
      data: repair
    });
  } catch (error) {
    console.error('Error al obtener reparación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


router.post('/', [
  body('carId').isInt({ min: 1 }),
  body('mechanicId').isInt({ min: 1 }),
  body('description').notEmpty().trim(),
  body('cost').isFloat({ min: 0 }),
  body('warranty').optional().isInt({ min: 0 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const {
      carId,
      mechanicId,
      description,
      cost,
      warranty = 90
    } = req.body;


    const car = await prisma.car.findUnique({
      where: { id: carId }
    });

    if (!car) {
      return res.status(400).json({
        success: false,
        message: 'Auto no encontrado'
      });
    }


    const mechanic = await prisma.mechanic.findUnique({
      where: { id: mechanicId }
    });

    if (!mechanic) {
      return res.status(400).json({
        success: false,
        message: 'Mecánico no encontrado'
      });
    }


    const repair = await prisma.repair.create({
      data: {
        carId,
        mechanicId,
        description,
        cost: parseFloat(cost),
        warranty
      },
      include: {
        car: {
          include: {
            client: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            status: true
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
        }
      }
    });


    const updatedCar = await prisma.car.update({
      where: { id: carId },
      data: { statusId: CAR_STATUS.EN_REPARACION },
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


    try {
      await emailService.sendCarStateChangeNotification(updatedCar);
    } catch (emailError) {
      console.error('Error sending repair created email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Reparación creada exitosamente',
      data: repair
    });

  } catch (error) {
    console.error('Error al crear reparación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


router.put('/:id', [
  body('description').optional().trim(),
  body('cost').optional().isFloat({ min: 0 }),
  body('warranty').optional().isInt({ min: 0 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;


    const existingRepair = await prisma.repair.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingRepair) {
      return res.status(404).json({
        success: false,
        message: 'Reparación no encontrada'
      });
    }


    if (updateData.cost) {
      updateData.cost = parseFloat(updateData.cost);
    }


    const updatedRepair = await prisma.repair.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        car: {
          include: {
            client: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            status: true
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
        }
      }
    });

    res.json({
      success: true,
      message: 'Reparación actualizada exitosamente',
      data: updatedRepair
    });

  } catch (error) {
    console.error('Error al actualizar reparación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;


    const existingRepair = await prisma.repair.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingRepair) {
      return res.status(404).json({
        success: false,
        message: 'Reparación no encontrada'
      });
    }


    const payments = await prisma.payment.findMany({
      where: { repairId: parseInt(id) }
    });

    if (payments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una reparación que tiene pagos asociados'
      });
    }


    await prisma.repair.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Reparación eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar reparación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


router.get('/car/:carId', async (req, res) => {
  try {
    const { carId } = req.params;

    const repairs = await prisma.repair.findMany({
      where: { carId: parseInt(carId) },
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
    });

    res.json({
      success: true,
      data: repairs
    });
  } catch (error) {
    console.error('Error al obtener reparaciones por auto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


router.get('/mechanic/:mechanicId', async (req, res) => {
  try {
    const { mechanicId } = req.params;

    const repairs = await prisma.repair.findMany({
      where: { mechanicId: parseInt(mechanicId) },
      include: {
        car: {
          include: {
            client: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: repairs
    });
  } catch (error) {
    console.error('Error al obtener reparaciones por mecánico:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
