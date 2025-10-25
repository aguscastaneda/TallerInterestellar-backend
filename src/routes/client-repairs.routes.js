const express = require("express");
const { PrismaClient } = require("@prisma/client");

const {
  authenticateToken,
  requireRole,
} = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;

    if (
      req.user.role !== "admin" &&
      req.user.role !== "cliente" &&
      req.user.client?.id !== parseInt(clientId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado. No puedes ver reparaciones de otros clientes.",
      });
    }

    if (
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "cliente" &&
      req.user.client?.id !== parseInt(clientId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado. No puedes ver reparaciones de otros clientes.",
      });
    }

    const cars = await prisma.car.findMany({
      where: { clientId: parseInt(clientId) },
      include: {
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
        serviceRequests: {
          include: {
            assignedMechanic: {
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
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("Autos obtenidos para cliente:", clientId, cars.map(car => ({
      id: car.id,
      licensePlate: car.licensePlate,
      statusId: car.statusId,
      statusName: car.status?.name
    })));

    const allStatuses = await prisma.carStatus.findMany({
      orderBy: { id: "asc" },
    });

    res.json({
      success: true,
      data: {
        cars: cars.map((car) => {
          if (!car.mechanic && car.serviceRequests?.length > 0) {
            const latestRequestWithMechanic = car.serviceRequests
              .filter((req) => req.assignedMechanic)
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

            if (latestRequestWithMechanic) {
              return {
                ...car,
                mechanic: latestRequestWithMechanic.assignedMechanic,
              };
            }
          }
          return car;
        }),
        statuses: allStatuses,
      },
    });
  } catch (error) {
    console.error("Error al obtener arreglos del cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.get("/:clientId/status/:statusId", async (req, res) => {
  try {
    const { clientId, statusId } = req.params;

    if (
      req.user.role !== "admin" &&
      req.user.role !== "cliente" &&
      req.user.client?.id !== parseInt(clientId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado. No puedes ver reparaciones de otros clientes.",
      });
    }

    if (
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "cliente" &&
      req.user.client?.id !== parseInt(clientId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado. No puedes ver reparaciones de otros clientes.",
      });
    }

    const cars = await prisma.car.findMany({
      where: {
        clientId: parseInt(clientId),
        statusId: parseInt(statusId),
      },
      include: {
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
        serviceRequests: {
          include: {
            assignedMechanic: {
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
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: cars.map((car) => {
        if (!car.mechanic && car.serviceRequests?.length > 0) {
          const latestRequestWithMechanic = car.serviceRequests
            .filter((req) => req.assignedMechanic)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

          if (latestRequestWithMechanic) {
            return {
              ...car,
              mechanic: latestRequestWithMechanic.assignedMechanic,
            };
          }
        }
        return car;
      }),
    });
  } catch (error) {
    console.error("Error al obtener arreglos filtrados:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

module.exports = router;
