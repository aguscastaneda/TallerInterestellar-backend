const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { ROLES, CAR_STATUS, SERVICE_REQUEST_STATUS, PAYMENT_STATUS, PAYMENT_METHODS, STATUS_TRANSLATIONS, CAR_STATUS_COLORS, CAR_STATUS_TAB_COLORS } = require('../constants');

const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();


router.get('/system', async (req, res) => {
  try {

    const roles = await prisma.role.findMany({
      orderBy: { id: 'asc' }
    });


    const carStatuses = await prisma.carStatus.findMany({
      orderBy: { id: 'asc' }
    });


    const carStatusesWithColors = carStatuses.map(status => ({
      ...status,
      color: CAR_STATUS_COLORS[status.id] || 'bg-gray-100 text-gray-800',
      tabColor: CAR_STATUS_TAB_COLORS[status.id] || 'bg-gray-500 hover:bg-gray-600'
    }));


    const serviceRequestStatuses = Object.entries(SERVICE_REQUEST_STATUS).map(([key, value]) => ({
      key,
      value,
      label: STATUS_TRANSLATIONS[value] || value
    }));


    const paymentStatuses = Object.entries(PAYMENT_STATUS).map(([key, value]) => ({
      key,
      value,
      label: value
    }));


    const paymentMethods = Object.entries(PAYMENT_METHODS).map(([key, value]) => ({
      key,
      value,
      label: value
    }));

    res.json({
      success: true,
      data: {
        roles,
        carStatuses: carStatusesWithColors,
        serviceRequestStatuses,
        paymentStatuses,
        paymentMethods,
        constants: {
          ROLES,
          CAR_STATUS,
          SERVICE_REQUEST_STATUS,
          PAYMENT_STATUS,
          PAYMENT_METHODS
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener configuración del sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


router.get('/roles', async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { id: 'asc' }
    });

    res.json({
      success: true,
      data: roles
    });

  } catch (error) {
    console.error('Error al obtener roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


router.get('/car-statuses', async (req, res) => {
  try {
    const carStatuses = await prisma.carStatus.findMany({
      orderBy: { id: 'asc' }
    });

    const carStatusesWithColors = carStatuses.map(status => ({
      ...status,
      color: CAR_STATUS_COLORS[status.id] || 'bg-gray-100 text-gray-800',
      tabColor: CAR_STATUS_TAB_COLORS[status.id] || 'bg-gray-500 hover:bg-gray-600'
    }));

    res.json({
      success: true,
      data: carStatusesWithColors
    });

  } catch (error) {
    console.error('Error al obtener estados de autos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;