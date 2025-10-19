const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de la base de datos...');

  console.log('Creando roles...');
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, name: 'Cliente' }
    }),
    prisma.role.upsert({
      where: { id: 2 },
      update: {},
      create: { id: 2, name: 'Mecánico' }
    }),
    prisma.role.upsert({
      where: { id: 3 },
      update: {},
      create: { id: 3, name: 'Jefe' }
    }),
    prisma.role.upsert({
      where: { id: 4 },
      update: {},
      create: { id: 4, name: 'Admin' }
    }),
    prisma.role.upsert({
      where: { id: 5 },
      update: {},
      create: { id: 5, name: 'Recepcionista' }
    })
  ]);
  console.log('Roles creados:', roles.map(r => r.name));

  console.log('Creando estados de auto...');
  
  const carStatuses = await Promise.all([
    prisma.carStatus.upsert({
      where: { id: 1 },
      update: { name: 'Entrada' },
      create: { id: 1, name: 'Entrada' }
    }),
    prisma.carStatus.upsert({
      where: { id: 2 },
      update: { name: 'Pendiente' },
      create: { id: 2, name: 'Pendiente' }
    }),
    prisma.carStatus.upsert({
      where: { id: 3 },
      update: { name: 'En revision' },
      create: { id: 3, name: 'En revision' }
    }),
    prisma.carStatus.upsert({
      where: { id: 4 },
      update: { name: 'Rechazado' },
      create: { id: 4, name: 'Rechazado' }
    }),
    prisma.carStatus.upsert({
      where: { id: 5 },
      update: { name: 'En reparacion' },
      create: { id: 5, name: 'En reparacion' }
    }),
    prisma.carStatus.upsert({
      where: { id: 6 },
      update: { name: 'Finalizado' },
      create: { id: 6, name: 'Finalizado' }
    }),
    prisma.carStatus.upsert({
      where: { id: 7 },
      update: { name: 'Entregado' },
      create: { id: 7, name: 'Entregado' }
    }),
    prisma.carStatus.upsert({
      where: { id: 8 },
      update: { name: 'Cancelado' },
      create: { id: 8, name: 'Cancelado' }
    })
  ]);
  console.log('Estados de auto creados:', carStatuses.map(s => s.name));

  console.log('Creando usuario admin...');
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@taller.com' },
    update: {},
    create: {
      name: 'Admin',
      lastName: 'Taller',
      email: 'admin@taller.com',
      password: adminPassword,
      phone: '1234567890',
      cuil: '12345678901',
      roleId: 4,
      active: true
    }
  });

  const admin = await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id
    }
  });
  console.log('Admin creado:', adminUser.email);

  console.log('Creando usuario jefe de mecánicos...');
  const bossPassword = await bcrypt.hash('jefe123', 12);
  const bossUser = await prisma.user.upsert({
    where: { email: 'jefe@taller.com' },
    update: {},
    create: {
      name: 'Jefe',
      lastName: 'Mecánicos',
      email: 'jefe@taller.com',
      password: bossPassword,
      phone: '1234567895',
      cuil: '12345678906',
      roleId: 3,
      active: true
    }
  });

  const boss = await prisma.boss.upsert({
    where: { userId: bossUser.id },
    update: {},
    create: {
      userId: bossUser.id
    }
  });
  console.log('Jefe creado:', bossUser.email);

  console.log('Creando usuarios mecánicos...');
  const mechanicPassword = await bcrypt.hash('mecanico123', 12);
  
  const mechanic1User = await prisma.user.upsert({
    where: { email: 'mecanico1@taller.com' },
    update: {},
    create: {
      name: 'Juan',
      lastName: 'Mecánico',
      email: 'mecanico1@taller.com',
      password: mechanicPassword,
      phone: '1234567891',
      cuil: '12345678902',
      roleId: 2,
      active: true
    }
  });

  const mechanic1 = await prisma.mechanic.upsert({
    where: { userId: mechanic1User.id },
    update: {},
    create: {
      userId: mechanic1User.id,
      bossId: boss.id
    }
  });

  const mechanic2User = await prisma.user.upsert({
    where: { email: 'mecanico2@taller.com' },
    update: {},
    create: {
      name: 'Carlos',
      lastName: 'Técnico',
      email: 'mecanico2@taller.com',
      password: mechanicPassword,
      phone: '1234567892',
      cuil: '12345678903',
      roleId: 2,
      active: true
    }
  });

  const mechanic2 = await prisma.mechanic.upsert({
    where: { userId: mechanic2User.id },
    update: {},
    create: {
      userId: mechanic2User.id,
      bossId: boss.id
    }
  });
  console.log('Mecánicos creados:', [mechanic1User.email, mechanic2User.email]);

  console.log('Creando usuarios clientes...');
  const clientPassword = await bcrypt.hash('cliente123', 12);
  
  const client1User = await prisma.user.upsert({
    where: { email: 'cliente1@email.com' },
    update: {},
    create: {
      name: 'María',
      lastName: 'Cliente',
      email: 'cliente1@email.com',
      password: clientPassword,
      phone: '1234567893',
      cuil: '12345678904',
      roleId: 1,
      active: true
    }
  });

  const client1 = await prisma.client.upsert({
    where: { userId: client1User.id },
    update: {},
    create: {
      userId: client1User.id
    }
  });

  const client2User = await prisma.user.upsert({
    where: { email: 'cliente2@email.com' },
    update: {},
    create: {
      name: 'Pedro',
      lastName: 'Automotor',
      email: 'cliente2@email.com',
      password: clientPassword,
      phone: '1234567894',
      cuil: '12345678905',
      roleId: 1,
      active: true
    }
  });

  const client2 = await prisma.client.upsert({
    where: { userId: client2User.id },
    update: {},
    create: {
      userId: client2User.id
    }
  });
  console.log('Clientes creados:', [client1User.email, client2User.email]);


  console.log('Creando usuario recepcionista...');
  const recepcionistaPassword = await bcrypt.hash('recepcionista123', 12);
  const recepcionistaUser = await prisma.user.upsert({
    where: { email: 'recepcionista@taller.com' },
    update: {},
    create: {
      name: 'Ana',
      lastName: 'Recepcionista',
      email: 'recepcionista@taller.com',
      password: recepcionistaPassword,
      phone: '1234567897',
      cuil: '12345678907',
      roleId: 5,
      active: true
    }
  });

  const recepcionista = await prisma.recepcionista.upsert({
    where: { userId: recepcionistaUser.id },
    update: {},
    create: {
      userId: recepcionistaUser.id
    }
  });
  console.log('Recepcionista creado:', recepcionistaUser.email);

  console.log('Creando autos...');
  const car1 = await prisma.car.upsert({
    where: { licensePlate: 'ABC123' },
    update: {},
    create: {
      clientId: client1.id,
      licensePlate: 'ABC123',
      brand: 'Toyota',
      model: 'Corolla',
      kms: 45000,
      chassis: '1HGBH41JXMN109186',
      description: 'Auto en buen estado',
      statusId: 1,
      priority: 1
    }
  });

  const car2 = await prisma.car.upsert({
    where: { licensePlate: 'XYZ789' },
    update: {},
    create: {
      clientId: client2.id,
      licensePlate: 'XYZ789',
      brand: 'Ford',
      model: 'Focus',
      kms: 60000,
      chassis: '2T1BURHE0JC123456',
      description: 'Necesita revisión de frenos',
      statusId: 2,
      priority: 2,
      mechanicId: mechanic1.id
    }
  });
  console.log('Autos creados:', [car1.licensePlate, car2.licensePlate]);

  console.log('Creando reparaciones...');
  const repair1 = await prisma.repair.create({
    data: {
      carId: car2.id,
      mechanicId: mechanic1.id,
      description: 'Revisión y cambio de pastillas de freno',
      cost: 150.00,
      warranty: 90
    }
  });
  console.log('Reparación creada:', repair1.description);

  console.log('Creando pagos...');
  const payment1 = await prisma.payment.create({
    data: {
      repairId: repair1.id,
      clientId: client2.id,
      amount: 150.00,
      method: 'EFECTIVO',
      status: 'PENDIENTE'
    }
  });
  console.log('Pago creado:', `$${payment1.amount}`);

  console.log('\n¡Seed completado exitosamente!');
  console.log('\nCredenciales de prueba:');
  console.log('Admin: admin@taller.com / admin123');
  console.log('Jefe: jefe@taller.com / jefe123');
  console.log('Mecánico 1: mecanico1@taller.com / mecanico123');
  console.log('Mecánico 2: mecanico2@taller.com / mecanico123');
  console.log('Cliente 1: cliente1@email.com / cliente123');
  console.log('Cliente 2: cliente2@email.com / cliente123');
  console.log('Recepcionista: recepcionista@taller.com / recepcionista123');
}

main()
  .catch((e) => {
      console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
