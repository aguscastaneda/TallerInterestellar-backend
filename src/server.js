const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const { authenticateToken, requireRole } = require('./middlewares/authMiddleware');

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
const analyticsRoutes = require('./routes/analytics.routes');
const { getRedis, disconnectRedis } = require('./lib/redis');
const { getChannel, closeRabbit } = require('./lib/rabbitmq');

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

const allowedOrigins = [
  'https://www.tallerinterestellar.com.ar',
  'https://tallerinterestellar.com.ar',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL.trim();
  if (!allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    if (origin.endsWith('.vercel.app')) return callback(null, true);

    console.error(`Origen no permitido por CORS: ${origin}`);
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Taller Interestelar API funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health/redis', async (req, res) => {
  try {
    const client = await getRedis();
    await client.ping();
    res.json({ success: true, status: 'ok' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/health/queue', async (req, res) => {
  try {
    const ch = await getChannel();
    await ch.checkQueue(process.env.EMAIL_QUEUE_NAME || 'email_queue');
    res.json({ success: true, status: 'ok' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.use('/api/auth', authRoutes);

app.use('/api/cars', authenticateToken, carsRoutes);
app.use('/api/repairs', authenticateToken, repairsRoutes);
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/payments', authenticateToken, paymentsRoutes);
app.use('/api/requests', authenticateToken, requestsRoutes);
app.use('/api/car-states', authenticateToken, carStatesRoutes);
app.use('/api/client-repairs', authenticateToken, clientRepairsRoutes);
app.use('/api/config', authenticateToken, configRoutes);
app.use('/api/email', authenticateToken, emailRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

const checkTerminalStatusCars = async () => {
  try {
    const { CAR_STATUS } = require('./constants');
    const terminalStatuses = [CAR_STATUS.ENTREGADO, CAR_STATUS.RECHAZADO, CAR_STATUS.CANCELADO];

    const carsInTerminalStatus = await prisma.car.findMany({
      where: {
        statusId: { in: terminalStatuses }
      },
      select: {
        id: true,
        statusId: true,
        updatedAt: true
      }
    });

    if (carsInTerminalStatus.length > 0) {
      const now = new Date();
      const carsToUpdate = [];

      for (const car of carsInTerminalStatus) {
        const timeInTerminalStatus = now.getTime() - car.updatedAt.getTime();
        if (timeInTerminalStatus >= 15000) {
          carsToUpdate.push(car);
        }
      }

      if (carsToUpdate.length > 0) {
        console.log(`Encontrados ${carsToUpdate.length} autos en estado terminal que deben volver a ENTRADA`);

        for (const car of carsToUpdate) {
          try {
            const result = await prisma.car.update({
              where: { id: car.id },
              data: { statusId: CAR_STATUS.ENTRADA }
            });
            console.log(`Auto ${car.id} actualizado de estado ${car.statusId} a ENTRADA (verificación periódica). Tiempo en estado terminal: ${Math.floor((now.getTime() - car.updatedAt.getTime()) / 1000)}s`);
          } catch (error) {
            console.error(`Error al actualizar auto ${car.id} en verificación periódica:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error en verificación periódica de estados terminales:', error);
  }
};

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Conectado a la base de datos');

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });

    setInterval(() => {
      checkTerminalStatusCars();
    }, 10000);

    setTimeout(() => {
      checkTerminalStatusCars();
    }, 5000);

  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('Señal SIGTERM recibida. Cerrando servidor...');
  await prisma.$disconnect();
  await disconnectRedis().catch(() => { });
  await closeRabbit().catch(() => { });
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Señal SIGINT recibida. Cerrando servidor...');
  await prisma.$disconnect();
  await disconnectRedis().catch(() => { });
  await closeRabbit().catch(() => { });
  process.exit(0);
});

startServer();