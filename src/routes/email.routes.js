const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const emailService = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input data',
      errors: errors.array()
    });
  }
  next();
};

router.post('/test', [
  body('email').isEmail().withMessage('Valid email is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email } = req.body;

    console.log('Sending test email to:', email);

    const result = await emailService.sendTestEmail(email);

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          messageId: result.messageId,
          email: email
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error in test email route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

router.post('/registration-confirmation', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('name').notEmpty().withMessage('Name is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email, name } = req.body;

    const loginDateTime = new Date().toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    console.log('Sending registration confirmation to:', email);

    const result = await emailService.sendRegistrationConfirmation(email, name, loginDateTime);

    if (result.success) {
      res.json({
        success: true,
        message: 'Registration confirmation email sent successfully',
        data: {
          messageId: result.messageId,
          email: email,
          sentAt: loginDateTime
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send registration confirmation email',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error in registration confirmation email route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      configured: emailService.isConfigured,
      provider: 'Brevo (Sendinblue)',
      apiKey: process.env.BREVO_API_KEY ? 'Configured' : 'Not configured',
      senderEmail: process.env.BREVO_SENDER_EMAIL || 'Not configured',
      senderName: process.env.BREVO_SENDER_NAME || 'Not configured'
    }
  });
});

router.post('/test-car-state-change', async (req, res) => {
  try {
    const { carId, testEmail } = req.body;

    if (!carId) {
      return res.status(400).json({
        success: false,
        message: 'carId es requerido'
      });
    }

    const car = await prisma.car.findUnique({
      where: { id: parseInt(carId) },
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

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Auto no encontrado'
      });
    }

    const testCar = {
      ...car,
      client: {
        ...car.client,
        user: {
          ...car.client.user,
          email: testEmail || car.client.user.email
        }
      }
    };

    const result = await emailService.sendCarStateChangeNotification(testCar);

    res.json({
      success: true,
      message: 'Email de prueba enviado',
      data: result
    });

  } catch (error) {
    console.error('Error al enviar email de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;