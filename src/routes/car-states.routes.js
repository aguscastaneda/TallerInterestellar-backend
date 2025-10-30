const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { CAR_STATUS, SERVICE_REQUEST_STATUS } = require("../constants");
const emailService = require("../services/emailService");

const {
  authenticateToken,
  requireRole,
} = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

router.post(
  "/transition",
  requireRole("admin", "mecanico", "jefe"),
  async (req, res) => {
    try {
      const { carId, newStatusId, description } = req.body;

      if (!carId || !newStatusId) {
        return res.status(400).json({
          success: false,
          message: "carId y newStatusId son requeridos",
        });
      }

      const car = await prisma.car.findUnique({
        where: { id: parseInt(carId) },
        include: {
          status: true,
          client: {
            include: {
              user: true,
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

      const newStatus = await prisma.carStatus.findUnique({
        where: { id: parseInt(newStatusId) },
      });

      if (!newStatus) {
        return res.status(400).json({
          success: false,
          message: "Estado no válido",
        });
      }

      const updatedCar = await prisma.car.update({
        where: { id: parseInt(carId) },
        data: {
          statusId: parseInt(newStatusId),
          description: description || car.description,
        },
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

      try {
        await emailService.sendCarStateChangeNotification(
          updatedCar,
          car.status
        );
      } catch (emailError) {
        console.error("Error sending state change email:", emailError);
      }

      res.json({
        success: true,
        message: `Estado cambiado a ${newStatus.name}`,
        data: updatedCar,
      });
    } catch (error) {
      console.error("Error al cambiar estado del auto:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

router.get("/statuses", async (req, res) => {
  try {
    const statuses = await prisma.carStatus.findMany({
      orderBy: { id: "asc" },
    });

    res.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    console.error("Error al obtener estados:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.post("/accept-budget", async (req, res) => {
  try {
    const { carId } = req.body;

    if (!carId) {
      return res.status(400).json({
        success: false,
        message: "carId es requerido",
      });
    }

    const car = await prisma.car.findUnique({
      where: { id: parseInt(carId) },
      include: { client: true },
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
    const isClient =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "cliente";

    if (!isAdmin && !isClient) {
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado. Solo administradores y clientes pueden aceptar presupuestos.",
      });
    }

    if (isClient && req.user.client?.id !== car.clientId) {
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado. No puedes aceptar presupuestos de otros autos.",
      });
    }

    const serviceRequest = await prisma.serviceRequest.findFirst({
      where: {
        carId: parseInt(carId),
        status: SERVICE_REQUEST_STATUS.PRESUPUESTO_ENVIADO,
        assignedMechanicId: {
          not: null,
        },
      },
      include: {
        car: {
          include: {
            status: true,
            client: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!serviceRequest) {
      return res.status(400).json({
        success: false,
        message:
          "No se encontró una solicitud de servicio con presupuesto enviado asignada a un mecánico para este vehículo",
      });
    }

    const updatedServiceRequest = await prisma.serviceRequest.update({
      where: { id: serviceRequest.id },
      data: { status: SERVICE_REQUEST_STATUS.IN_REPAIR },
    });

    const updatedCar = await prisma.car.update({
      where: { id: parseInt(carId) },
      data: { statusId: CAR_STATUS.EN_REPARACION },
      include: {
        status: true,
        client: {
          include: {
            user: true,
          },
        },
      },
    });

    try {
      await emailService.sendCarStateChangeNotification(updatedCar);
    } catch (emailError) {
      console.error("Error sending budget accepted email:", emailError);
    }

    res.json({
      success: true,
      message: "Presupuesto aceptado, auto en reparación",
      data: { car: updatedCar, serviceRequest: updatedServiceRequest },
    });
  } catch (error) {
    console.error("Error al aceptar presupuesto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.post("/reject-budget", async (req, res) => {
  try {
    const { carId } = req.body;

    if (!carId) {
      return res.status(400).json({
        success: false,
        message: "carId es requerido",
      });
    }

    const car = await prisma.car.findUnique({
      where: { id: parseInt(carId) },
      include: { client: true },
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
    const isClient =
      req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "cliente";

    if (!isAdmin && !isClient) {
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado. Solo administradores y clientes pueden rechazar presupuestos.",
      });
    }

    if (isClient && req.user.client?.id !== car.clientId) {
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado. No puedes rechazar presupuestos de otros autos.",
      });
    }

    const serviceRequest = await prisma.serviceRequest.findFirst({
      where: {
        carId: parseInt(carId),
        status: SERVICE_REQUEST_STATUS.PRESUPUESTO_ENVIADO,
        assignedMechanicId: {
          not: null,
        },
      },
    });

    if (!serviceRequest) {
      return res.status(400).json({
        success: false,
        message:
          "No se encontró una solicitud de servicio con presupuesto enviado asignada a un mecánico para este vehículo",
      });
    }

    await prisma.serviceRequest.update({
      where: { id: serviceRequest.id },
      data: { status: SERVICE_REQUEST_STATUS.REJECTED },
    });

    await prisma.car.update({
      where: { id: parseInt(carId) },
      data: { statusId: CAR_STATUS.RECHAZADO },
    });

    const updatedCar = await prisma.car.update({
      where: { id: parseInt(carId) },
      data: { statusId: CAR_STATUS.ENTRADA },
      include: {
        status: true,
        client: {
          include: {
            user: true,
          },
        },
      },
    });

    try {
      await emailService.sendCarStateChangeNotification(updatedCar);
    } catch (emailError) {
      console.error("Error sending budget rejected email:", emailError);
    }

    res.json({
      success: true,
      message: "Presupuesto rechazado, auto vuelve a entrada",
      data: updatedCar,
    });
  } catch (error) {
    console.error("Error al rechazar presupuesto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.post(
  "/finish-repair",
  requireRole("admin", "mecanico", "jefe"),
  async (req, res) => {
    try {
      const { carId, finalDescription, finalCost } = req.body;

      if (!carId || !finalDescription || !finalCost) {
        return res.status(400).json({
          success: false,
          message: "carId, finalDescription y finalCost son requeridos",
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

      if (!isAdmin && !isMechanic && !isBoss) {
        return res.status(403).json({
          success: false,
          message:
            "Acceso denegado. No tienes permiso para finalizar reparaciones.",
        });
      }

      const repair = await prisma.repair.create({
        data: {
          carId: parseInt(carId),
          description: finalDescription,
          cost: parseFloat(finalCost),
          warranty: 90,
        },
      });

      const updatedCar = await prisma.car.update({
        where: { id: parseInt(carId) },
        data: { statusId: CAR_STATUS.FINALIZADO },
        include: {
          status: true,
          repairs: true,
          client: {
            include: {
              user: true,
            },
          },
        },
      });

      try {
        await emailService.sendCarStateChangeNotification(updatedCar);
      } catch (emailError) {
        console.error("Error sending repair finished email:", emailError);
      }

      res.json({
        success: true,
        message: "Reparación finalizada",
        data: updatedCar,
      });
    } catch (error) {
      console.error("Error al finalizar reparación:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

router.post(
  "/deliver-car",
  requireRole("admin", "recepcionista"),
  async (req, res) => {
    try {
      const { carId } = req.body;

      if (!carId) {
        return res.status(400).json({
          success: false,
          message: "carId es requerido",
        });
      }

      const isAdmin =
        req.user.role?.name
          ?.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") === "admin";
      const isReceptionist =
        req.user.role?.name
          ?.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") === "recepcionista";

      if (!isAdmin && !isReceptionist) {
        return res.status(403).json({
          success: false,
          message: "Acceso denegado. No tienes permiso para entregar autos.",
        });
      }

      const updatedCar = await prisma.car.update({
        where: { id: parseInt(carId) },
        data: { statusId: CAR_STATUS.ENTREGADO },
        include: {
          status: true,
          client: {
            include: {
              user: true,
            },
          },
        },
      });

      try {
        await emailService.sendCarStateChangeNotification(updatedCar);
      } catch (emailError) {
        console.error("Error sending car delivered email:", emailError);
      }

      res.json({
        success: true,
        message: "Auto entregado exitosamente",
        data: updatedCar,
      });
    } catch (error) {
      console.error("Error al entregar auto:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

module.exports = router;
