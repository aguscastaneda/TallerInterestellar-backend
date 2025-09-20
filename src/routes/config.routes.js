const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { ROLES, CAR_STATUS, SERVICE_REQUEST_STATUS, PAYMENT_STATUS, PAYMENT_METHODS, STATUS_TRANSLATIONS, CAR_STATUS_COLORS, CAR_STATUS_TAB_COLORS } = require('../constants');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/config/system - Obtener toda la configuración del sistema
router.get('/system', async (req, res) => {
  try {
    // Obtener roles desde la base de datos
    const roles = await prisma.role.findMany({
      orderBy: { id: 'asc' }
    });

    // Obtener estados de autos desde la base de datos
    const carStatuses = await prisma.carStatus.findMany({
      orderBy: { id: 'asc' }
    });

    // Mapear estados con colores
    const carStatusesWithColors = carStatuses.map(status => ({
      ...status,
      color: CAR_STATUS_COLORS[status.id] || 'bg-gray-100 text-gray-800',
      tabColor: CAR_STATUS_TAB_COLORS[status.id] || 'bg-gray-500 hover:bg-gray-600'
    }));

    // Configuración de estados de solicitudes
    const serviceRequestStatuses = Object.entries(SERVICE_REQUEST_STATUS).map(([key, value]) => ({
      key,
      value,
      label: STATUS_TRANSLATIONS[value] || value
    }));

    // Configuración de estados de pagos
    const paymentStatuses = Object.entries(PAYMENT_STATUS).map(([key, value]) => ({
      key,
      value,
      label: value
    }));

    // Configuración de métodos de pago
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

// GET /api/config/roles - Obtener solo los roles
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

// GET /api/config/car-statuses - Obtener solo los estados de autos
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
