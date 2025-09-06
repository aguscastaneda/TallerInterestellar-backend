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

// GET /api/payments - Obtener todos los pagos
router.get('/', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        repair: {
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
                email: true,
                phone: true
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
      data: payments
    });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/payments/:id - Obtener pago por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id) },
      include: {
        repair: {
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
                email: true,
                phone: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error al obtener pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/payments - Crear nuevo pago
router.post('/', [
  body('repairId').isInt({ min: 1 }),
  body('clientId').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0 }),
  body('method').notEmpty().trim(),
  body('status').optional().isIn(['PENDIENTE', 'PAGADO', 'CANCELADO']),
  handleValidationErrors
], async (req, res) => {
  try {
    const {
      repairId,
      clientId,
      amount,
      method,
      status = 'PENDIENTE'
    } = req.body;

    // Verificar si la reparación existe
    const repair = await prisma.repair.findUnique({
      where: { id: repairId }
    });

    if (!repair) {
      return res.status(400).json({
        success: false,
        message: 'Reparación no encontrada'
      });
    }

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

    // Verificar que el cliente sea el dueño del auto de la reparación
    if (repair.carId !== client.cars?.[0]?.id) {
      return res.status(400).json({
        success: false,
        message: 'El cliente no es el dueño del auto de esta reparación'
      });
    }

    // Crear el pago
    const payment = await prisma.payment.create({
      data: {
        repairId,
        clientId,
        amount: parseFloat(amount),
        method,
        status
      },
      include: {
        repair: {
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
                }
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
                email: true,
                phone: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Pago creado exitosamente',
      data: payment
    });

  } catch (error) {
    console.error('Error al crear pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/payments/:id - Actualizar pago
router.put('/:id', [
  body('amount').optional().isFloat({ min: 0 }),
  body('method').optional().trim(),
  body('status').optional().isIn(['PENDIENTE', 'PAGADO', 'CANCELADO']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar si el pago existe
    const existingPayment = await prisma.payment.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // Convertir monto si se proporciona
    if (updateData.amount) {
      updateData.amount = parseFloat(updateData.amount);
    }

    // Actualizar el pago
    const updatedPayment = await prisma.payment.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        repair: {
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
                }
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
                email: true,
                phone: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Pago actualizado exitosamente',
      data: updatedPayment
    });

  } catch (error) {
    console.error('Error al actualizar pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/payments/:id - Eliminar pago
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el pago existe
    const existingPayment = await prisma.payment.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // Solo permitir eliminar pagos pendientes
    if (existingPayment.status !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden eliminar pagos pendientes'
      });
    }

    // Eliminar el pago
    await prisma.payment.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/payments/repair/:repairId - Obtener pagos por reparación
router.get('/repair/:repairId', async (req, res) => {
  try {
    const { repairId } = req.params;
    
    const payments = await prisma.payment.findMany({
      where: { repairId: parseInt(repairId) },
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error al obtener pagos por reparación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/payments/client/:clientId - Obtener pagos por cliente
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const payments = await prisma.payment.findMany({
      where: { clientId: parseInt(clientId) },
      include: {
        repair: {
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
                }
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
      data: payments
    });
  } catch (error) {
    console.error('Error al obtener pagos por cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/payments/status/:status - Obtener pagos por estado
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    
    const payments = await prisma.payment.findMany({
      where: { status: status.toUpperCase() },
      include: {
        repair: {
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
                }
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
                email: true,
                phone: true
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
      data: payments
    });
  } catch (error) {
    console.error('Error al obtener pagos por estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
