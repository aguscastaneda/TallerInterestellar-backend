const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth.routes');
const carsRoutes = require('./routes/cars.routes');
const repairsRoutes = require('./routes/repairs.routes');
const usersRoutes = require('./routes/users.routes');
const paymentsRoutes = require('./routes/payments.routes');
const requestsRoutes = require('./routes/requests.routes');
const carStatesRoutes = require('./routes/car-states.routes');
const clientRepairsRoutes = require('./routes/client-repairs.routes');
const configRoutes = require('./routes/config.routes');
const emailRoutes = require('./routes/email.routes');

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Taller Interestelar API funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/repairs', repairsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/car-states', carStatesRoutes);
app.use('/api/client-repairs', clientRepairsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/email', emailRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Conectado a la base de datos');

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });

  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('Señal SIGTERM recibida. Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Señal SIGINT recibida. Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
