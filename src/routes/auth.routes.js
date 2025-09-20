const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { ROLES } = require('../constants');
const emailService = require('../services/emailService');

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

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').optional().trim(),
  body('cuil').optional().trim(),
  body('roleId').isInt({ min: 1, max: Object.values(ROLES).length }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email, password, name, lastName, phone, cuil, roleId } = req.body;

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

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        lastName,
        phone,
        cuil,
        roleId
      },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
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
    if (roleId === ROLES.CLIENT) {
      await prisma.client.create({
        data: { userId: user.id }
      });
    } else if (roleId === ROLES.MECHANIC) {
      await prisma.mechanic.create({
        data: { userId: user.id }
      });
    } else if (roleId === ROLES.BOSS) {
      await prisma.boss.create({
        data: { userId: user.id }
      });
    } else if (roleId === ROLES.ADMIN) {
      await prisma.admin.create({
        data: { userId: user.id }
      });
    } else if (roleId === ROLES.RECEPTIONIST) {
      await prisma.recepcionista.create({
        data: { userId: user.id }
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(
        user.email,
        `${user.name} ${user.lastName}`,
        user.role.name
      );
      console.log('✅ Welcome email sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️  Failed to send welcome email:', emailError.message);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        client: true,
        mechanic: true,
        boss: true,
        admin: true,
        recepcionista: true
      }
    });

    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Remover contraseña de la respuesta
    const { password: _, ...userWithoutPassword } = user;

    // Send login confirmation email
    try {
      const loginDateTime = new Date().toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      await emailService.sendRegistrationConfirmation(
        user.email,
        `${user.name} ${user.lastName}`,
        loginDateTime
      );
      console.log('✅ Login confirmation email sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️  Failed to send login confirmation email:', emailError.message);
      // Don't fail login if email fails
    }

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
        client: true,
        mechanic: true,
        boss: true,
        admin: true,
        recepcionista: true
      }
    });

    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    const { password, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword
    });

  } catch (error) {
    console.error('Error en verificación de token:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email } = req.body;

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        active: true
      }
    });

    // Por seguridad, siempre respondemos exitosamente incluso si el email no existe
    if (!user || !user.active) {
      return res.json({
        success: true,
        message: 'Si el email está registrado, recibirás un enlace para restablecer tu contraseña'
      });
    }

    // Generar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Guardar token en la base de datos
    try {
      await prisma.passwordReset.create({
        data: {
          email: user.email,
          token: resetToken,
          expiresAt: resetTokenExpiry
        }
      });
    } catch (dbError) {
      console.error('Database error when saving reset token:', dbError.message);
      // Si la tabla no existe, continuamos sin guardar en DB
      // El token se enviará por email de todas formas
    }

    // Enviar email de reset
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        `${user.name} ${user.lastName}`,
        resetToken
      );
      console.log('✅ Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️  Failed to send password reset email:', emailError.message);
      // No fallar la operación si el email falla
    }

    res.json({
      success: true,
      message: 'Si el email está registrado, recibirás un enlace para restablecer tu contraseña'
    });

  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Buscar token válido
    let passwordReset;
    try {
      passwordReset = await prisma.passwordReset.findFirst({
        where: {
          token,
          expiresAt: {
            gt: new Date()
          },
          used: false
        }
      });
    } catch (dbError) {
      console.error('Database error when finding reset token:', dbError.message);
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    if (!passwordReset) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: passwordReset.email }
    });

    if (!user || !user.active) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña del usuario
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // Marcar token como usado
    try {
      await prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: { used: true }
      });
    } catch (dbError) {
      console.error('Database error when marking token as used:', dbError.message);
      // Continuamos aunque no se pueda marcar el token
    }

    res.json({
      success: true,
      message: 'Contraseña restablecida exitosamente'
    });

  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
