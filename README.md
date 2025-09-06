# Taller Interestelar - Backend

Backend del Sistema de Gestión de Taller Mecánico desarrollado con Node.js, Express y Prisma.

## 🚀 Características

- **Autenticación JWT** con roles de usuario (Cliente, Mecánico, Jefe)
- **Gestión completa de autos** con estados y prioridades
- **Sistema de reparaciones** con asignación de mecánicos
- **Gestión de pagos** con diferentes métodos y estados
- **API RESTful** con validaciones y manejo de errores
- **Base de datos MySQL** con Prisma ORM
- **Scripts de seed** para datos de prueba

## 📋 Requisitos

- Node.js 18+ 
- MySQL 8.0+
- npm o yarn

## 🛠️ Instalación

1. **Clonar el repositorio**
```bash
cd backend
npm install
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar el archivo `.env` con tu configuración:
```env
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/taller_interestellar"
JWT_SECRET=tu-clave-secreta-super-segura-aqui
PORT=3001
NODE_ENV=development
```

3. **Configurar la base de datos**
```bash
# Generar cliente Prisma
npm run db:generate

# Crear/actualizar tablas en la base de datos
npm run db:push

# Poblar con datos de prueba (opcional)
npm run db:seed
```

4. **Iniciar el servidor**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🗄️ Estructura de la Base de Datos

### Modelos principales:
- **User**: Usuarios del sistema con roles
- **Client**: Clientes del taller
- **Mechanic**: Mecánicos del taller
- **Boss**: Jefes/administradores
- **Car**: Autos de los clientes
- **CarStatus**: Estados de los autos
- **Repair**: Reparaciones realizadas
- **Payment**: Pagos de las reparaciones
- **Notification**: Notificaciones del sistema

## 🔌 Endpoints de la API

### Autenticación
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Login de usuarios
- `GET /api/auth/me` - Obtener perfil del usuario autenticado

### Usuarios
- `GET /api/users` - Listar todos los usuarios
- `GET /api/users/:id` - Obtener usuario por ID
- `PUT /api/users/:id` - Actualizar usuario
- `PUT /api/users/:id/change-password` - Cambiar contraseña
- `DELETE /api/users/:id` - Desactivar usuario
- `GET /api/users/mechanics/list` - Listar mecánicos
- `GET /api/users/clients/list` - Listar clientes

### Autos
- `GET /api/cars` - Listar todos los autos
- `GET /api/cars/:id` - Obtener auto por ID
- `POST /api/cars` - Crear nuevo auto
- `PUT /api/cars/:id` - Actualizar auto
- `DELETE /api/cars/:id` - Eliminar auto
- `GET /api/cars/status/:statusId` - Autos por estado

### Reparaciones
- `GET /api/repairs` - Listar todas las reparaciones
- `GET /api/repairs/:id` - Obtener reparación por ID
- `POST /api/repairs` - Crear nueva reparación
- `PUT /api/repairs/:id` - Actualizar reparación
- `DELETE /api/repairs/:id` - Eliminar reparación
- `GET /api/repairs/car/:carId` - Reparaciones por auto
- `GET /api/repairs/mechanic/:mechanicId` - Reparaciones por mecánico

### Pagos
- `GET /api/payments` - Listar todos los pagos
- `GET /api/payments/:id` - Obtener pago por ID
- `POST /api/payments` - Crear nuevo pago
- `PUT /api/payments/:id` - Actualizar pago
- `DELETE /api/payments/:id` - Eliminar pago
- `GET /api/payments/repair/:repairId` - Pagos por reparación
- `GET /api/payments/client/:clientId` - Pagos por cliente
- `GET /api/payments/status/:status` - Pagos por estado

## 🔑 Usuarios de Prueba

Después de ejecutar `npm run db:seed`, tendrás estos usuarios:

### Jefe/Admin
- **Email**: admin@taller.com
- **Contraseña**: admin123

### Mecánicos
- **Email**: mecanico1@taller.com
- **Contraseña**: mecanico123
- **Email**: mecanico2@taller.com
- **Contraseña**: mecanico123

### Clientes
- **Email**: cliente1@email.com
- **Contraseña**: cliente123
- **Email**: cliente2@email.com
- **Contraseña**: cliente123

## 🧪 Testing

Para probar la API, puedes usar:

- **Postman** o **Insomnia**
- **cURL** desde la terminal
- **Thunder Client** (extensión de VS Code)

### Ejemplo de login:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@taller.com","password":"admin123"}'
```

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── routes/          # Rutas de la API
│   ├── controllers/     # Controladores (futuro)
│   ├── middlewares/     # Middlewares (futuro)
│   ├── services/        # Servicios (futuro)
│   ├── scripts/         # Scripts de utilidad
│   └── server.js        # Servidor principal
├── prisma/
│   └── schema.prisma    # Esquema de la base de datos
├── package.json
└── README.md
```

## 🚀 Próximas Mejoras

- [ ] Middleware de autenticación
- [ ] Controladores separados
- [ ] Servicios de negocio
- [ ] Validaciones más robustas
- [ ] Tests unitarios y de integración
- [ ] Documentación con Swagger
- [ ] Logging y monitoreo
- [ ] Rate limiting
- [ ] Compresión de respuestas

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Si tienes alguna pregunta o problema, por favor abre un issue en el repositorio.
