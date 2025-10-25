const express = require("express");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");

const {
  authenticateToken,
  requireRole,
} = require("../middlewares/authMiddleware");

const router = express.Router();
const prisma = new PrismaClient();

let mercadoPago = null;
let isConfigured = false;

try {
  const { MercadoPagoConfig, Preference } = require("mercadopago");

  if (!process.env.MP_KEY) {
    throw new Error("MP_KEY environment variable is required");
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_KEY,
    options: {
      timeout: 5000,
    },
  });

  mercadoPago = {
    preference: new Preference(client),
  };

  isConfigured = true;
  console.log("MercadoPago SDK configured successfully");
} catch (error) {
  console.warn("MercadoPago SDK not available:", error.message);
  console.warn("Running in simulation mode for development");
  isConfigured = false;
}

const config = {
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  backendUrl: process.env.BACKEND_URL || "http://localhost:3001",
  isProduction: process.env.NODE_ENV === "production",
};

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Invalid input data",
      errors: errors.array(),
    });
  }
  next();
};

const formatPhoneNumber = (phone) => {
  if (!phone) return "11111111";
  return phone
    .replace(/[^0-9]/g, "")
    .slice(-8)
    .padStart(8, "1");
};

const generateFallbackEmail = (clientId) => {
  return `client${clientId}@taller-interestellar.com`;
};

router.get(
  "/pending/:repairId",
  authenticateToken,
  async (req, res) => {
    try {
      const { repairId } = req.params;

      const pendingPayment = await prisma.payment.findFirst({
        where: {
          repairId: parseInt(repairId),
          status: "PENDIENTE",
        },
        include: {
          repair: {
            include: {
              car: {
                include: {
                  client: true,
                },
              },
            },
          },
        },
      });

      if (!pendingPayment) {
        return res.json({
          success: true,
          data: null,
          message: "No hay pagos pendientes para esta reparación",
        });
      }

      const isAdmin = req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "admin";
      const isClient = req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "cliente" &&
        req.user.client?.id === pendingPayment.clientId;

      if (!isAdmin && !isClient) {
        return res.status(403).json({
          success: false,
          message: "Acceso denegado. No tienes permiso para ver este pago.",
        });
      }

      const canCancelAfter = new Date(pendingPayment.createdAt.getTime() + 30 * 60 * 1000);
      const now = new Date();
      const canCancelNow = now >= canCancelAfter;

      res.json({
        success: true,
        data: {
          ...pendingPayment,
          canCancelNow,
          canCancelAfter,
          minutesLeft: canCancelNow ? 0 : Math.ceil((canCancelAfter - now) / (1000 * 60)),
        },
      });
    } catch (error) {
      console.error("Error al obtener pago pendiente:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

router.post(
  "/cancel-pending/:paymentId",
  authenticateToken,
  async (req, res) => {
    try {
      const { paymentId } = req.params;

      const payment = await prisma.payment.findUnique({
        where: { id: parseInt(paymentId) },
        include: {
          repair: {
            include: {
              car: {
                include: {
                  client: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Pago no encontrado",
        });
      }

      if (payment.status !== "PENDIENTE") {
        return res.status(400).json({
          success: false,
          message: "Solo se pueden cancelar pagos pendientes",
        });
      }

      const isAdmin = req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "admin";
      const isClient = req.user.role?.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === "cliente" &&
        req.user.client?.id === payment.clientId;

      if (!isAdmin && !isClient) {
        return res.status(403).json({
          success: false,
          message: "Acceso denegado. No tienes permiso para cancelar este pago.",
        });
      }

      const updatedPayment = await prisma.payment.update({
        where: { id: parseInt(paymentId) },
        data: { status: "CANCELADO" },
      });

      res.json({
        success: true,
        message: "Pago cancelado exitosamente",
        data: updatedPayment,
      });
    } catch (error) {
      console.error("Error al cancelar pago:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

router.post(
  "/create-preference",
  [
    body("repairId")
      .isInt({ min: 1 })
      .withMessage("Valid repair ID is required"),
    body("clientId")
      .isInt({ min: 1 })
      .withMessage("Valid client ID is required"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { repairId, clientId } = req.body;

      console.log("Starting payment process:", { repairId, clientId });

      if (
        req.user.role?.name
          ?.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") === "cliente" &&
        req.user.client?.id !== parseInt(clientId)
      ) {
        return res.status(403).json({
          success: false,
          message: "Acceso denegado. No puedes ver pagos de otros clientes.",
        });
      }

      const repair = await prisma.repair.findUnique({
        where: { id: parseInt(repairId) },
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
            },
          },
        },
      });

      if (!repair) {
        return res.status(404).json({
          success: false,
          message: "Repair not found",
        });
      }

      if (repair.car.client.id !== parseInt(clientId)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to pay for this repair",
        });
      }

      const repairCost = parseFloat(repair.cost);
      if (!repairCost || repairCost <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid repair cost for payment processing",
        });
      }

      const existingPayment = await prisma.payment.findFirst({
        where: {
          repairId: parseInt(repairId),
          status: "PENDIENTE",
        },
      });

      if (existingPayment) {

        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        if (existingPayment.createdAt < thirtyMinutesAgo) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: { status: "CANCELADO" },
          });
          console.log(`Pago pendiente cancelado automáticamente: ${existingPayment.id}`);
        } else {
          return res.status(400).json({
            success: false,
            message: "Ya existe un pago pendiente para esta reparación. Por favor, complete o cancele el pago existente antes de crear uno nuevo.",
            data: {
              existingPaymentId: existingPayment.id,
              createdAt: existingPayment.createdAt,
              canCancelAfter: new Date(existingPayment.createdAt.getTime() + 30 * 60 * 1000),
            },
          });
        }
      }

      const user = repair.car.client.user;
      if (!user.name || !user.lastName) {
        return res.status(400).json({
          success: false,
          message:
            "Incomplete user information. Name and surname are required.",
        });
      }

      console.log("Validation passed. Creating payment preference...");

      if (!isConfigured) {
        console.log("Using simulation mode");

        const simulationPayment = await prisma.payment.create({
          data: {
            repairId: parseInt(repairId),
            clientId: parseInt(clientId),
            amount: repairCost,
            method: "MERCADOPAGO_SIMULATION",
            status: "PENDIENTE",
            externalId: `sim_${Date.now()}_${repairId}`,
          },
        });

        const simulationUrl = `${config.frontendUrl}/home/client/repairs?payment=success&simulation=true`;

        return res.json({
          success: true,
          message: "Simulation payment created (MercadoPago not available)",
          data: {
            payment: simulationPayment,
            preferenceId: `sim_${Date.now()}`,
            initPoint: simulationUrl,
            sandboxInitPoint: simulationUrl,
            simulation: true,
          },
        });
      }

      const preferenceData = {
        items: [
          {
            id: `repair_${repair.id}`,
            title: `Repair ${repair.car.brand} ${repair.car.model} - ${repair.car.licensePlate}`,
            description: repair.description || "Vehicle repair service",
            quantity: 1,
            unit_price: repairCost,
          },
        ],

        payer: {
          name: user.name,
          surname: user.lastName,
          email: user.email || generateFallbackEmail(repair.car.client.id),
          phone: {
            area_code: "11",
            number: formatPhoneNumber(user.phone),
          },
        },

        back_urls: {
          success: `${config.frontendUrl}/home/client/repairs?payment=success`,
          failure: `${config.frontendUrl}/home/client/repairs?payment=failure`,
          pending: `${config.frontendUrl}/home/client/repairs?payment=pending`,
        },

        notification_url: `${config.backendUrl}/api/payments/webhook`,
        external_reference: `repair_${repair.id}_client_${clientId}`,

        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12,
        },
      };

      console.log(
        "MercadoPago preference data:",
        JSON.stringify(preferenceData, null, 2)
      );

      const mpPreference = await mercadoPago.preference.create({
        body: preferenceData,
      });

      console.log("MercadoPago preference created:", mpPreference.id);

      const payment = await prisma.payment.create({
        data: {
          repairId: parseInt(repairId),
          clientId: parseInt(clientId),
          amount: repairCost,
          method: "MERCADOPAGO",
          status: "PENDIENTE",
          externalId: mpPreference.id,
        },
      });

      res.json({
        success: true,
        message: "Payment preference created successfully",
        data: {
          payment,
          preferenceId: mpPreference.id,
          initPoint: mpPreference.init_point,
          sandboxInitPoint: mpPreference.sandbox_init_point,
        },
      });
    } catch (error) {
      console.error("Error creating payment preference:", error);

      if (error.status && error.message) {
        return res.status(400).json({
          success: false,
          message: "MercadoPago API error",
          details: error.message,
          mpError: true,
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: config.isProduction ? undefined : error.message,
      });
    }
  }
);

router.post("/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    console.log("Webhook received:", { type, data });

    if (type === "payment") {
      const paymentId = data.id;
      console.log(`Payment notification received: ${paymentId}`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Error");
  }
});

module.exports = router;
