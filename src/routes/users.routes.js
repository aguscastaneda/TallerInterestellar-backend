const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
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

// POST /api/users - Crear nuevo usuario
router.post('/', [
  body('name').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('cuil').optional().trim(),
  body('phone').optional().trim(),
  body('roleId').isInt({ min: 1, max: 4 }),
  body('bossId').optional().isInt({ min: 1 }),
  handleValidationErrors
], async (req, res) => {
  try {
    console.log('Creando usuario con datos:', req.body);
    const { name, lastName, email, password, cuil, phone, roleId, bossId } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Verificar si el CUIL ya existe (si se proporciona)
    if (cuil) {
      const existingCUIL = await prisma.user.findFirst({
        where: { cuil }
      });

      if (existingCUIL) {
        return res.status(400).json({
          success: false,
          message: 'El CUIL ya está registrado'
        });
      }
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        name,
        lastName,
        email,
        password: hashedPassword,
        cuil,
        phone,
        roleId,
        active: true
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        cuil: true,
        active: true,
        role: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true
      }
    });

    // Crear perfil específico según el rol
    if (roleId === 1) { // Cliente
      await prisma.client.create({
        data: { userId: user.id }
      });
    } else if (roleId === 2) { // Mecánico
      const mechanic = await prisma.mechanic.create({
        data: { 
          userId: user.id,
          bossId: req.body.bossId ? parseInt(req.body.bossId) : null
        }
      });
    } else if (roleId === 3) { // Jefe
      await prisma.boss.create({
        data: { userId: user.id }
      });
    } else if (roleId === 4) { // Admin
      await prisma.admin.create({
        data: { userId: user.id }
      });
    }

    // Obtener el usuario con su perfil específico
    let userWithProfile = user;
    if (roleId === 2) { // Mecánico
      userWithProfile = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          mechanic: {
            include: {
              boss: {
                include: {
                  user: {
                    select: { id: true, name: true, lastName: true }
                  }
                }
              }
            }
          }
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: userWithProfile
    });

  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users - Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        cuil: true,
        active: true,
        role: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/:id - Obtener usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        cuil: true,
        active: true,
        role: {
          select: {
            id: true,
            name: true
          }
        },
        client: true,
        mechanic: true,
        boss: true,
        admin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', [
  body('name').optional().trim(),
  body('lastName').optional().trim(),
  body('phone').optional().trim(),
  body('cuil').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 6 }),
  body('active').optional().isBoolean(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el email ya está en uso por otro usuario
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email }
      });
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está en uso por otro usuario'
        });
      }
    }

    // Hashear la contraseña si se proporciona una nueva
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Actualizar el usuario
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        cuil: true,
        active: true,
        role: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser
    });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/users/:id/change-password - Cambiar contraseña
router.put('/:id/change-password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, existingUser.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Hash de la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar la contraseña
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedNewPassword }
    });

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/users/:id - Eliminar usuario (desactivar)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Toggle del estado activo/inactivo
    const newActiveState = !existingUser.active;
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { active: newActiveState }
    });

    res.json({
      success: true,
      message: `Usuario ${newActiveState ? 'activado' : 'desactivado'} correctamente`
    });

  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/role/:roleId - Obtener usuarios por rol
router.get('/role/:roleId', async (req, res) => {
  try {
    const { roleId } = req.params;
    
    const users = await prisma.user.findMany({
      where: { 
        roleId: parseInt(roleId),
        active: true
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        cuil: true,
        role: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error al obtener usuarios por rol:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/mechanics - Obtener solo mecánicos
router.get('/mechanics/list', async (req, res) => {
  try {
    const mechanics = await prisma.mechanic.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            phone: true,
            active: true
          }
        }
      },
      where: {
        user: {
          active: true
        }
      },
      orderBy: {
        user: {
          name: 'asc'
        }
      }
    });
    // Agregar bossId de cada mecánico en respuesta
    const mechanicsWithBoss = mechanics.map(m => ({ ...m, bossId: m.bossId || null }));
    res.json({
      success: true,
      data: mechanicsWithBoss
    });
  } catch (error) {
    console.error('Error al obtener mecánicos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/users/bosses/list - Obtener jefes de mecánicos
router.get('/bosses/list', async (req, res) => {
  try {
    const bosses = await prisma.boss.findMany({
      include: {
        user: { select: { id: true, name: true, lastName: true, email: true, phone: true, active: true } },
        mechanics: { include: { user: { select: { id: true, name: true, lastName: true, email: true, active: true } } } }
      },
      where: { user: { active: true } },
      orderBy: { user: { name: 'asc' } }
    });
    res.json({ success: true, data: bosses });
  } catch (error) {
    console.error('Error al obtener jefes:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// PUT /api/users/mechanics/:mechanicId/assign-boss - Asignar jefe a un mecánico
router.put('/mechanics/:mechanicId/assign-boss', [
  body('bossId').isInt({ min: 1 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const { bossId } = req.body;

    const mech = await prisma.mechanic.findUnique({ where: { id: parseInt(mechanicId) } });
    if (!mech) return res.status(404).json({ success: false, message: 'Mecánico no encontrado' });

    const boss = await prisma.boss.findUnique({ where: { id: parseInt(bossId) } });
    if (!boss) return res.status(404).json({ success: false, message: 'Jefe no encontrado' });

    const updated = await prisma.mechanic.update({ where: { id: parseInt(mechanicId) }, data: { bossId: parseInt(bossId) }, include: { user: true, boss: { include: { user: true } } } });
    res.json({ success: true, message: 'Jefe asignado', data: updated });
  } catch (error) {
    console.error('Error al asignar jefe:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/users/clients - Obtener solo clientes
router.get('/clients/list', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            phone: true,
            cuil: true,
            active: true
          }
        }
      },
      where: {
        user: {
          active: true
        }
      },
      orderBy: {
        user: {
          name: 'asc'
        }
      }
    });
    
    res.json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
