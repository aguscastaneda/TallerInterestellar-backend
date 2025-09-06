const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const carsRoutes = require('./routes/cars.routes');
const repairsRoutes = require('./routes/repairs.routes');
const usersRoutes = require('./routes/users.routes');
const paymentsRoutes = require('./routes/payments.routes');

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Taller Interestelar API funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/repairs', repairsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/payments', paymentsRoutes);

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
      console.log(`🔗 API disponible en: http://localhost:${PORT}/api`);
      console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
      console.log(`🚗 Cars: http://localhost:${PORT}/api/cars`);
      console.log(`🔧 Repairs: http://localhost:${PORT}/api/repairs`);
      console.log(`👥 Users: http://localhost:${PORT}/api/users`);
      console.log(`💰 Payments: http://localhost:${PORT}/api/payments`);
    });

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de señales de terminación
process.on('SIGTERM', async () => {
  console.log('🛑 Señal SIGTERM recibida. Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Señal SIGINT recibida. Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

// Iniciar servidor
startServer();
