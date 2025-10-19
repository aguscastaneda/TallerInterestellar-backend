const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const { CAR_STATUS } = require("../constants");

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

router.get(
  "/all-items",
  requireRole("admin", "mecanico", "jefe"),
  async (req, res) => {
    try {
      const { search } = req.query;

      const repairs = await prisma.repair.findMany({
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
                      phone: true,
                      cuil: true,
                      createdAt: true,
                    },
                  },
                },
              },
              status: true,
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
          status: true,
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
      });

      let allItems = repairs.map((repair) => ({
        ...repair,
        type: "repair",
      }));

      const carsWithRepairs = new Set(repairs.map((repair) => repair.carId));
      const carsWithoutRepairs = cars
        .filter((car) => !carsWithRepairs.has(car.id) && car.statusId === 1)
        .map((car) => ({
          ...car,
          type: "car",
          isPlaceholder: true,
          description: "Auto sin reparaciones asignadas",
          cost: 0,
          warranty: 0,
          mechanic: null,
          mechanicId: null,
        }));

      allItems = [...allItems, ...carsWithoutRepairs];

      if (search && search.trim()) {
        const searchTerm = search.trim().toLowerCase();
        allItems = allItems.filter(
          (item) =>
            item.car?.licensePlate?.toLowerCase().includes(searchTerm) ||
            item.licensePlate?.toLowerCase().includes(searchTerm) ||
            item.car?.client?.user?.name?.toLowerCase().includes(searchTerm) ||
            item.client?.user?.name?.toLowerCase().includes(searchTerm) ||
            item.car?.client?.user?.lastName
              ?.toLowerCase()
              .includes(searchTerm) ||
            item.client?.user?.lastName?.toLowerCase().includes(searchTerm) ||
            item.mechanic?.user?.name?.toLowerCase().includes(searchTerm) ||
            item.mechanic?.user?.lastName?.toLowerCase().includes(searchTerm) ||
            item.description?.toLowerCase().includes(searchTerm)
        );
      }

      allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json({
        success: true,
        data: allItems,
      });
    } catch (error) {
      console.error("Error al obtener todos los items:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

router.get("/", requireRole("admin", "mecanico", "jefe"), async (req, res) => {
  try {
    const repairs = await prisma.repair.findMany({
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
                    phone: true,
                    cuil: true,
                    createdAt: true,
                  },
                },
              },
            },
            status: true,
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: repairs,
    });
  } catch (error) {
    console.error("Error al obtener reparaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de reparación inválido",
      });
    }

    const repair = await prisma.repair.findUnique({
      where: { id: parseInt(id) },
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
                    phone: true,
                    cuil: true,
                    createdAt: true,
                  },
                },
              },
            },
            status: true,
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
        payments: {
          include: {
            client: {
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

    if (!repair) {
      return res.status(404).json({
        success: false,
        message: "Reparación no encontrada",
      });
    }

    const isAdmin =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "admin";
    const isMechanic =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "mecanico" &&
      req.user.mechanic?.id === repair.mechanicId;
    const isBoss =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "jefe";
    const isClient =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "cliente" &&
      req.user.client?.id === repair.car.clientId;

    if (!isAdmin && !isMechanic && !isBoss && !isClient) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. No tienes permiso para ver esta reparación.",
      });
    }

    res.json({
      success: true,
      data: repair,
    });
  } catch (error) {
    console.error("Error al obtener reparación:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.post(
  "/",
  requireRole("admin", "mecanico", "jefe"),
  [
    body("carId").isInt({ min: 1 }),
    body("mechanicId").isInt({ min: 1 }),
    body("description").notEmpty().trim(),
    body("cost").isFloat({ min: 0 }),
    body("warranty").optional().isInt({ min: 0 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { carId, mechanicId, description, cost, warranty = 90 } = req.body;

      const car = await prisma.car.findUnique({
        where: { id: carId },
      });

      if (!car) {
        return res.status(400).json({
          success: false,
          message: "Auto no encontrado",
        });
      }

      const mechanic = await prisma.mechanic.findUnique({
        where: { id: mechanicId },
      });

      if (!mechanic) {
        return res.status(400).json({
          success: false,
          message: "Mecánico no encontrado",
        });
      }

      const repair = await prisma.repair.create({
        data: {
          carId,
          mechanicId,
          description,
          cost: parseFloat(cost),
          warranty,
        },
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
                      phone: true,
                    },
                  },
                },
              },
              status: true,
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
        },
      });

      const updatedCar = await prisma.car.update({
        where: { id: carId },
        data: { statusId: CAR_STATUS.EN_REPARACION },
        include: {
          status: true,
          client: {
            include: {
              user: true,
            },
          },
          mechanic: {
            include: {
              user: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Reparación creada exitosamente",
        data: repair,
      });
    } catch (error) {
      console.error("Error al crear reparación:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

router.put(
  "/:id",
  requireRole("admin", "mecanico", "jefe"),
  [
    body("description").optional().trim(),
    body("cost").optional().isFloat({ min: 0 }),
    body("warranty").optional().isInt({ min: 0 }),
    body("statusId").optional().isInt({ min: 1 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const existingRepair = await prisma.repair.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existingRepair) {
        return res.status(404).json({
          success: false,
          message: "Reparación no encontrada",
        });
      }

      let hasPermission = false;

      if (req.user.role?.id === 4 || req.user.role?.id === 3) {
        hasPermission = true;
      } else if (
        req.user.role?.id === 2 &&
        req.user.mechanic?.id === existingRepair.mechanicId
      ) {
        hasPermission = true;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message:
            "Acceso denegado. No tienes permiso para actualizar esta reparación.",
        });
      }

      if (updateData.cost) {
        updateData.cost = parseFloat(updateData.cost);
      }

      if (updateData.hasOwnProperty("statusId")) {
        updateData.statusId = parseInt(updateData.statusId);
      }

      const updatedRepair = await prisma.repair.update({
        where: { id: parseInt(id) },
        data: updateData,
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
                      phone: true,
                    },
                  },
                },
              },
              status: true,
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
        },
      });

      res.json({
        success: true,
        message: "Reparación actualizada exitosamente",
        data: updatedRepair,
      });
    } catch (error) {
      console.error("Error al actualizar reparación:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const existingRepair = await prisma.repair.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingRepair) {
      return res.status(404).json({
        success: false,
        message: "Reparación no encontrada",
      });
    }

    const payments = await prisma.payment.findMany({
      where: { repairId: parseInt(id) },
    });

    if (payments.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "No se puede eliminar una reparación que tiene pagos asociados",
      });
    }

    await prisma.repair.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: "Reparación eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar reparación:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.get("/car/:carId", async (req, res) => {
  try {
    const { carId } = req.params;

    const car = await prisma.car.findUnique({
      where: { id: parseInt(carId) },
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Auto no encontrado",
      });
    }

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
    const isClient =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "cliente" &&
      req.user.client?.id === car.clientId;

    if (!isAdmin && !isMechanic && !isBoss && !isClient) {
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado. No tienes permiso para ver las reparaciones de este auto.",
      });
    }

    const repairs = await prisma.repair.findMany({
      where: { carId: parseInt(carId) },
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
    });

    res.json({
      success: true,
      data: repairs,
    });
  } catch (error) {
    console.error("Error al obtener reparaciones por auto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.get("/mechanic/:mechanicId", async (req, res) => {
  try {
    const { mechanicId } = req.params;

    const isAdmin =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "admin";
    const isMechanic =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "mecanico" &&
      req.user.mechanic?.id === parseInt(mechanicId);
    const isBoss =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "jefe";

    if (!isAdmin && !isMechanic && !isBoss) {
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado. No tienes permiso para ver las reparaciones de este mecánico.",
      });
    }

    const repairs = await prisma.repair.findMany({
      where: { mechanicId: parseInt(mechanicId) },
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
                    phone: true,
                  },
                },
              },
            },
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: repairs,
    });
  } catch (error) {
    console.error("Error al obtener reparaciones por mecánico:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

module.exports = router;
