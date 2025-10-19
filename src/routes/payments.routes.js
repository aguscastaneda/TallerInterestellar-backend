const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();


let mercadoPago = null;
let isConfigured = false;

try {
  const { MercadoPagoConfig, Preference } = require('mercadopago');

  if (!process.env.MP_KEY) {
    throw new Error('MP_KEY environment variable is required');
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_KEY,
    options: {
      timeout: 5000
    }
  });

  mercadoPago = {
    preference: new Preference(client)
  };

  isConfigured = true;
  console.log('MercadoPago SDK configured successfully');

} catch (error) {
  console.warn('MercadoPago SDK not available:', error.message);
  console.warn('Running in simulation mode for development');
  isConfigured = false;
}


const config = {
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  isProduction: process.env.NODE_ENV === 'production'
};


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


const formatPhoneNumber = (phone) => {
  if (!phone) return '11111111';
  return phone.replace(/[^0-9]/g, '').slice(-8).padStart(8, '1');
};

const generateFallbackEmail = (clientId) => {
  return `client${clientId}@taller-interestellar.com`;
};


router.post('/create-preference', [
  body('repairId').isInt({ min: 1 }).withMessage('Valid repair ID is required'),
  body('clientId').isInt({ min: 1 }).withMessage('Valid client ID is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { repairId, clientId } = req.body;

    console.log('Starting payment process:', { repairId, clientId });


    const repair = await prisma.repair.findUnique({
      where: { id: parseInt(repairId) },
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
    });


    if (!repair) {
      return res.status(404).json({
        success: false,
        message: 'Repair not found'
      });
    }


    if (repair.car.client.id !== parseInt(clientId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to pay for this repair'
      });
    }


    const repairCost = parseFloat(repair.cost);
    if (!repairCost || repairCost <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid repair cost for payment processing'
      });
    }


    const existingPayment = await prisma.payment.findFirst({
      where: {
        repairId: parseInt(repairId),
        status: 'PENDIENTE'
      }
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'A pending payment already exists for this repair'
      });
    }


    const user = repair.car.client.user;
    if (!user.name || !user.lastName) {
      return res.status(400).json({
        success: false,
        message: 'Incomplete user information. Name and surname are required.'
      });
    }

    console.log('Validation passed. Creating payment preference...');


    if (!isConfigured) {
      console.log('Using simulation mode');

      const simulationPayment = await prisma.payment.create({
        data: {
          repairId: parseInt(repairId),
          clientId: parseInt(clientId),
          amount: repairCost,
          method: 'MERCADOPAGO_SIMULATION',
          status: 'PENDIENTE',
          externalId: `sim_${Date.now()}_${repairId}`
        }
      });

      const simulationUrl = `${config.frontendUrl}/home/client/repairs?payment=success&simulation=true`;

      return res.json({
        success: true,
        message: 'Simulation payment created (MercadoPago not available)',
        data: {
          payment: simulationPayment,
          preferenceId: `sim_${Date.now()}`,
          initPoint: simulationUrl,
          sandboxInitPoint: simulationUrl,
          simulation: true
        }
      });
    }


    const preferenceData = {
      items: [{
        id: `repair_${repair.id}`,
        title: `Repair ${repair.car.brand} ${repair.car.model} - ${repair.car.licensePlate}`,
        description: repair.description || 'Vehicle repair service',
        quantity: 1,
        unit_price: repairCost
      }],

      payer: {
        name: user.name,
        surname: user.lastName,
        email: user.email || generateFallbackEmail(repair.car.client.id),
        phone: {
          area_code: '11',
          number: formatPhoneNumber(user.phone)
        }
      },

      back_urls: {
        success: `${config.frontendUrl}/home/client/repairs?payment=success`,
        failure: `${config.frontendUrl}/home/client/repairs?payment=failure`,
        pending: `${config.frontendUrl}/home/client/repairs?payment=pending`
      },

      notification_url: `${config.backendUrl}/api/payments/webhook`,
      external_reference: `repair_${repair.id}_client_${clientId}`,

      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12
      }
    };

    console.log('MercadoPago preference data:', JSON.stringify(preferenceData, null, 2));

    const mpPreference = await mercadoPago.preference.create({
      body: preferenceData
    });

    console.log('MercadoPago preference created:', mpPreference.id);

    const payment = await prisma.payment.create({
      data: {
        repairId: parseInt(repairId),
        clientId: parseInt(clientId),
        amount: repairCost,
        method: 'MERCADOPAGO',
        status: 'PENDIENTE',
        externalId: mpPreference.id
      }
    });

    res.json({
      success: true,
      message: 'Payment preference created successfully',
      data: {
        payment,
        preferenceId: mpPreference.id,
        initPoint: mpPreference.init_point,
        sandboxInitPoint: mpPreference.sandbox_init_point
      }
    });

  } catch (error) {
    console.error('Error creating payment preference:', error);

    if (error.status && error.message) {
      return res.status(400).json({
        success: false,
        message: 'MercadoPago API error',
        details: error.message,
        mpError: true
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: config.isProduction ? undefined : error.message
    });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;

    console.log('Webhook received:', { type, data });

    if (type === 'payment') {
      const paymentId = data.id;
      console.log(`Payment notification received: ${paymentId}`);


    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

module.exports = router;