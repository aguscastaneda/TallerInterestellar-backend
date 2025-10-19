const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de acceso requerido",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
        client: true,
        mechanic: true,
        boss: {
          include: {
            mechanics: {
              include: {
                user: true,
              },
            },
          },
        },
        admin: true,
        recepcionista: true,
      },
    });

    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        message: "Usuario no válido o inactivo",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token inválido",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expirado",
      });
    }

    console.error("Error en autenticación:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      });
    }

    const userRole = req.user.role?.name
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const normalizedRoles = roles.map((r) =>
      r
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    );

    if (!userRole || !normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. Rol insuficiente.",
      });
    }

    next();
  };
};

const requireAdmin = requireRole("admin");
const requireJefe = requireRole("jefe", "admin");
const requireMecanico = requireRole("mecanico", "jefe", "admin");
const requireCliente = requireRole("cliente");
const requireAuthenticated = requireRole(
  "cliente",
  "mecanico",
  "jefe",
  "admin"
);

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireJefe,
  requireMecanico,
  requireCliente,
  requireAuthenticated,
};
