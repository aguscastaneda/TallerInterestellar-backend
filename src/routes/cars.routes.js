const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const licensePlateValidator = require("../utils/licensePlateValidator");
const emailService = require("../services/emailService");

const {
  authenticateToken,
  requireRole,
} = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Datos de entrada inválidos",
      errors: errors.array(),
    });
  }
  next();
};

router.get("/", requireRole("admin", "recepcionista"), async (req, res) => {
  try {
    const cars = await prisma.car.findMany({
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                phone: true,
                cuil: true,
                createdAt: true,
              },
            },
          },
        },
        mechanic: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
              },
            },
          },
        },
        status: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: cars,
    });
  } catch (error) {
    console.error("Error al obtener autos:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.get(
  "/plate/:licensePlate",
  requireRole("admin", "mecanico", "jefe", "recepcionista"),
  async (req, res) => {
    try {
      const { licensePlate } = req.params;
      const car = await prisma.car.findUnique({
        where: { licensePlate },
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  cuil: true,
                  createdAt: true,
                },
              },
            },
          },
          mechanic: {
            include: {
              user: { select: { id: true, name: true, lastName: true } },
            },
          },
          status: true,
        },
      });

      if (!car) {
        return res
          .status(404)
          .json({ success: false, message: "Patente inexistente" });
      }

      res.json({ success: true, data: car });
    } catch (error) {
      console.error("Error al buscar por patente:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }
);

router.get("/client/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;

    if (
      req.user.role !== "admin" &&
      req.user.client?.id !== parseInt(clientId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. No puedes ver autos de otros clientes.",
      });
    }

    const cars = await prisma.car.findMany({
      where: { clientId: parseInt(clientId) },
      include: {
        status: true,
        mechanic: {
          include: {
            user: { select: { id: true, name: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: cars });
  } catch (error) {
    console.error("Error al obtener autos del cliente:", error);
    res
      .status(500)
      .json({ success: false, message: "Error interno del servidor" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const car = await prisma.car.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                phone: true,
                cuil: true,
                createdAt: true,
              },
            },
          },
        },
        mechanic: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
              },
            },
          },
        },
        status: true,
        repairs: {
          include: {
            mechanic: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Auto no encontrado",
      });
    }

    const isOwner = req.user.client?.id === car.clientId;
    const isAdmin =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "admin";
    const isMechanic =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "mecanico";
    const isBoss =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "jefe";

    if (!isOwner && !isAdmin && !isMechanic && !isBoss) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. No tienes permiso para ver este auto.",
      });
    }

    res.json({
      success: true,
      data: car,
    });
  } catch (error) {
    console.error("Error al obtener auto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.post(
  "/",
  requireRole("admin", "recepcionista", "cliente"),
  [
    body("clientId")
      .isInt({ min: 1 })
      .withMessage("El ID del cliente es obligatorio"),
    body("licensePlate")
      .notEmpty()
      .trim()
      .withMessage("La patente es obligatoria")
      .custom((value) => {
        try {
          licensePlateValidator(value);
          return true;
        } catch (error) {
          throw new Error(error.message);
        }
      }),
    body("brand").notEmpty().trim().withMessage("La marca es obligatoria"),
    body("model").notEmpty().trim().withMessage("El modelo es obligatorio"),
    body("year")
      .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
      .withMessage("El año es obligatorio y debe ser válido"),
    body("kms")
      .isInt({ min: 0 })
      .withMessage("Los kilómetros son obligatorios"),
    body("chassis")
      .isLength({ min: 17, max: 17 })
      .withMessage("El chasis debe tener exactamente 17 caracteres")
      .trim()
      .custom((value) => {
        if (!value || value.length !== 17) {
          throw new Error("El chasis debe tener exactamente 17 caracteres");
        }
        return true;
      }),
    body("statusId").optional().isInt({ min: 0 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const {
        clientId,
        licensePlate: rawLicensePlate,
        brand,
        model,
        year,
        kms,
        chassis,
        statusId = 1,
      } = req.body;

      if (req.user.role?.name === 'cliente' && req.user.client?.id !== parseInt(clientId)) {
        return res.status(403).json({
          success: false,
          message: "Acceso denegado. No puedes crear autos para otros clientes.",
        });
      }

      const licensePlate = licensePlateValidator(rawLicensePlate);
      const capitalizedChassis = chassis.toUpperCase();

      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        return res.status(400).json({
          success: false,
          message: "Cliente no encontrado",
        });
      }

      const existingCar = await prisma.car.findUnique({
        where: { licensePlate },
      });

      if (existingCar) {
        return res.status(400).json({
          success: false,
          message: "Ya existe un auto con esa patente",
        });
      }

      const car = await prisma.car.create({
        data: {
          clientId,
          licensePlate,
          brand,
          model,
          year,
          kms,
          chassis: capitalizedChassis,
          statusId,
        },
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  cuil: true,
                  createdAt: true,
                },
              },
            },
          },
          status: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Auto creado exitosamente",
        data: car,
      });
    } catch (error) {
      console.error("Error al crear auto:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

router.put(
  "/:id",
  requireRole("admin", "recepcionista"),
  [
    body("licensePlate")
      .optional()
      .trim()
      .custom((value) => {
        try {
          licensePlateValidator(value);
          return true;
        } catch (error) {
          throw new Error(error.message);
        }
      }),
    body("brand").optional().trim(),
    body("model").optional().trim(),
    body("year")
      .optional()
      .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
      .withMessage("El año debe ser válido"),
    body("kms").optional().isInt({ min: 0 }),
    body("chassis")
      .optional()
      .isLength({ min: 17, max: 17 })
      .withMessage("El chasis debe tener exactamente 17 caracteres")
      .trim()
      .custom((value) => {
        if (value && value.length !== 17) {
          throw new Error("El chasis debe tener exactamente 17 caracteres");
        }
        return true;
      }),
    body("statusId").optional().isInt({ min: 0 }),
    body("mechanicId").optional().isInt({ min: 1 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (updateData.licensePlate) {
        updateData.licensePlate = licensePlateValidator(
          updateData.licensePlate
        );
      }

      if (updateData.chassis) {
        updateData.chassis = updateData.chassis.toUpperCase();
      }

      const existingCar = await prisma.car.findUnique({
        where: { id: parseInt(id) },
        include: {
          status: true,
        },
      });

      if (!existingCar) {
        return res.status(404).json({
          success: false,
          message: "Auto no encontrado",
        });
      }

      if (
        updateData.licensePlate &&
        updateData.licensePlate !== existingCar.licensePlate
      ) {
        const carWithSamePlate = await prisma.car.findUnique({
          where: { licensePlate: updateData.licensePlate },
        });

        if (carWithSamePlate) {
          return res.status(400).json({
            success: false,
            message: "Ya existe un auto con esa patente",
          });
        }
      }

      if (updateData.mechanicId) {
        const mechanic = await prisma.mechanic.findUnique({
          where: { id: updateData.mechanicId },
        });

        if (!mechanic) {
          return res.status(400).json({
            success: false,
            message: "Mecánico no encontrado",
          });
        }
      }

      const updatedCar = await prisma.car.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  cuil: true,
                  createdAt: true,
                },
              },
            },
          },
          mechanic: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                },
              },
            },
          },
          status: true,
        },
      });

      // Enviar email de notificación si se cambió el estado
      if (updateData.statusId && updateData.statusId !== existingCar.statusId) {
        try {
          await emailService.sendCarStateChangeNotification(
            updatedCar,
            existingCar.status
          );
        } catch (emailError) {
          console.error("Error sending car state change email:", emailError);
        }
      }

      res.json({
        success: true,
        message: "Auto actualizado exitosamente",
        data: updatedCar,
      });
    } catch (error) {
      console.error("Error al actualizar auto:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

router.delete("/:id", requireRole("admin", "cliente"), async (req, res) => {
  try {
    const { id } = req.params;

    const existingCar = await prisma.car.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingCar) {
      return res.status(404).json({
        success: false,
        message: "Auto no encontrado",
      });
    }

    if (req.user.role?.name === 'cliente' && req.user.client?.id !== existingCar.clientId) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. No puedes eliminar autos de otros clientes.",
      });
    }

    const repairs = await prisma.repair.findMany({
      where: { carId: parseInt(id) },
    });

    if (repairs.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "No se puede eliminar un auto que tiene reparaciones asociadas",
      });
    }

    const serviceRequests = await prisma.serviceRequest.findMany({
      where: { carId: parseInt(id) },
    });

    if (serviceRequests.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "No se puede eliminar un auto que tiene solicitudes de servicio asociadas",
      });
    }

    await prisma.car.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: "Auto eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar auto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.get(
  "/status/:statusId",
  requireRole("admin", "mecanico", "jefe"),
  async (req, res) => {
    try {
      const { statusId } = req.params;

      const cars = await prisma.car.findMany({
        where: { statusId: parseInt(statusId) },
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  cuil: true,
                  createdAt: true,
                },
              },
            },
          },
          mechanic: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                },
              },
            },
          },
          status: true,
        },
        orderBy: {
          priority: "desc",
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        data: cars,
      });
    } catch (error) {
      console.error("Error al obtener autos por estado:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

module.exports = router;
