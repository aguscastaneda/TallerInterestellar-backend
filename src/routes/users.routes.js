const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { ROLES } = require("../constants");

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

router.post(
  "/",
  authenticateToken,
  requireRole("admin", "jefe"),
  [
    body("name").notEmpty().trim(),
    body("lastName").notEmpty().trim(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("cuil").optional().trim(),
    body("phone").optional().trim(),
    body("roleId").isInt({ min: 1, max: 4 }),
    body("bossId").optional().isInt({ min: 1 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      console.log("Creando usuario con datos:", req.body);
      console.log("Usuario autenticado:", req.user);
      const { name, lastName, email, password, cuil, phone, roleId, bossId } =
        req.body;

      if (req.user.role === "jefe" && roleId !== 2) {
        return res.status(403).json({
          success: false,
          message: "Los jefes de mecánicos solo pueden crear mecánicos.",
        });
      }

      if (req.user.role === "jefe") {
        console.log("Boss ID del usuario autenticado:", req.user.boss?.id);
        console.log("Boss ID enviado en la solicitud:", bossId);
        if (bossId !== req.user.boss?.id) {
          return res.status(403).json({
            success: false,
            message:
              "Los jefes de mecánicos solo pueden asignar mecánicos a sí mismos.",
          });
        }
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "El email ya está registrado",
        });
      }

      if (cuil) {
        const existingCUIL = await prisma.user.findFirst({
          where: { cuil },
        });

        if (existingCUIL) {
          return res.status(400).json({
            success: false,
            message: "El CUIL ya está registrado",
          });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          name,
          lastName,
          email,
          password: hashedPassword,
          cuil,
          phone,
          roleId,
          active: true,
        },
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          phone: true,
          cuil: true,
          active: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          createdAt: true,
        },
      });

      if (roleId === ROLES.CLIENT) {
        await prisma.client.create({
          data: { userId: user.id },
        });
      } else if (roleId === ROLES.MECHANIC) {
        const mechanic = await prisma.mechanic.create({
          data: {
            userId: user.id,
            bossId: req.body.bossId ? parseInt(req.body.bossId) : null,
          },
        });
      } else if (roleId === ROLES.BOSS) {
        await prisma.boss.create({
          data: { userId: user.id },
        });
      } else if (roleId === ROLES.ADMIN) {
        await prisma.admin.create({
          data: { userId: user.id },
        });
      } else if (roleId === ROLES.RECEPTIONIST) {
        await prisma.recepcionista.create({
          data: { userId: user.id },
        });
      }

      let userWithProfile = user;
      if (roleId === ROLES.MECHANIC) {
        userWithProfile = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            mechanic: {
              include: {
                boss: {
                  include: {
                    user: {
                      select: { id: true, name: true, lastName: true },
                    },
                  },
                },
              },
            },
          },
        });
      }

      res.status(201).json({
        success: true,
        message: "Usuario creado exitosamente",
        data: userWithProfile,
      });
    } catch (error) {
      console.error("Error al crear usuario:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        cuil: true,
        active: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            id: true,
            cars: {
              include: {
                status: true,
              },
            },
          },
        },
        mechanic: {
          include: {
            boss: {
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
        },
        boss: {
          include: {
            mechanics: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                    active: true,
                  },
                },
              },
            },
          },
        },
        admin: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "admin" && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. No puedes ver el perfil de otros usuarios.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        cuil: true,
        active: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        client: true,
        mechanic: true,
        boss: true,
        admin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log("=== INICIO EDITAR USUARIO ===");
    console.log("Actualizando usuario con ID:", id);
    console.log("Datos de actualización:", updateData);
    console.log("Usuario autenticado:", JSON.stringify(req.user, null, 2));

    const targetUserId = parseInt(id);
    const isSelf = req.user.id === targetUserId;
    const isAdmin = req.user.roleId === 1;

    console.log("Verificando permisos - isSelf:", isSelf, "isAdmin:", isAdmin);

    let isBossOfMechanic = false;
    if (req.user.roleId === 3 && req.user.boss) {
      console.log(
        "Usuario autenticado es jefe, verificando relación con mecánico..."
      );

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: {
          mechanic: true,
        },
      });

      console.log("Usuario objetivo:", JSON.stringify(targetUser, null, 2));
      console.log("Boss ID del usuario autenticado:", req.user.boss.id);

      if (targetUser && targetUser.mechanic) {
        console.log(
          "Boss ID del mecánico objetivo:",
          targetUser.mechanic.bossId
        );
        console.log(
          "Comparando bossId:",
          targetUser.mechanic.bossId,
          "con",
          req.user.boss.id
        );

        if (targetUser.mechanic.bossId === req.user.boss.id) {
          isBossOfMechanic = true;
          console.log(
            "Usuario autenticado es jefe del mecánico objetivo (por bossId)"
          );
        } else {
          console.log(
            "Usuario autenticado NO es jefe del mecánico objetivo (por bossId)"
          );
        }

        if (req.user.boss.mechanics) {
          console.log(
            "Lista completa de mecánicos del jefe:",
            JSON.stringify(req.user.boss.mechanics, null, 2)
          );
          const mechanicInBossList = req.user.boss.mechanics.find(
            (mech) => mech.userId === targetUserId
          );
          if (mechanicInBossList) {
            isBossOfMechanic = true;
            console.log(
              "Mecánico encontrado en la lista de mecánicos del jefe"
            );
          } else {
            console.log(
              "Mecánico NO encontrado en la lista de mecánicos del jefe"
            );
          }
        }
      } else {
        console.log(
          "El usuario objetivo no es un mecánico o no tiene datos de mecánico"
        );
      }
    } else {
      console.log("Usuario autenticado NO es jefe o no tiene datos de jefe");
      console.log(
        "Role ID:",
        req.user.roleId,
        "Tiene boss data:",
        !!req.user.boss
      );
    }

    console.log(
      "Resultado de verificación - isBossOfMechanic:",
      isBossOfMechanic
    );

    if (!isAdmin && !isSelf && !isBossOfMechanic) {
      console.log(
        "Acceso denegado - isAdmin:",
        isAdmin,
        "isSelf:",
        isSelf,
        "isBossOfMechanic:",
        isBossOfMechanic
      );
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado. No puedes actualizar el perfil de otros usuarios.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "El email ya está en uso por otro usuario",
        });
      }
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        cuil: true,
        active: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: "Usuario actualizado exitosamente",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.put("/:id/change-password", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (req.user.role !== "admin" && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message:
          "Acceso denegado. No puedes cambiar la contraseña de otros usuarios.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    if (req.user.id === parseInt(id)) {
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        existingUser.password
      );
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: "Contraseña actual incorrecta",
        });
      }
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedNewPassword },
    });

    res.json({
      success: true,
      message: "Contraseña cambiada exitosamente",
    });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin", "jefe"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const targetUserId = parseInt(id);

      console.log("=== INICIO ELIMINAR USUARIO ===");
      console.log("Eliminando usuario con ID:", id);
      console.log("Usuario autenticado:", JSON.stringify(req.user, null, 2));

      const isSelf = req.user.id === targetUserId;
      const isAdmin = req.user.roleId === 1;

      console.log(
        "Verificando permisos - isSelf:",
        isSelf,
        "isAdmin:",
        isAdmin
      );

      let isBossOfMechanic = false;
      if (req.user.roleId === 3 && req.user.boss) {
        console.log(
          "Usuario autenticado es jefe, verificando relación con mecánico..."
        );

        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          include: {
            mechanic: true,
          },
        });

        console.log(
          "Usuario objetivo para eliminación:",
          JSON.stringify(targetUser, null, 2)
        );
        console.log("Boss ID del usuario autenticado:", req.user.boss.id);

        if (targetUser && targetUser.mechanic) {
          console.log(
            "Boss ID del mecánico objetivo:",
            targetUser.mechanic.bossId
          );
          console.log(
            "Comparando bossId:",
            targetUser.mechanic.bossId,
            "con",
            req.user.boss.id
          );

          if (targetUser.mechanic.bossId === req.user.boss.id) {
            isBossOfMechanic = true;
            console.log(
              "Usuario autenticado es jefe del mecánico objetivo (por bossId)"
            );
          } else {
            console.log(
              "Usuario autenticado NO es jefe del mecánico objetivo (por bossId)"
            );
          }

          if (req.user.boss.mechanics) {
            console.log(
              "Lista completa de mecánicos del jefe:",
              JSON.stringify(req.user.boss.mechanics, null, 2)
            );
            const mechanicInBossList = req.user.boss.mechanics.find(
              (mech) => mech.userId === targetUserId
            );
            if (mechanicInBossList) {
              isBossOfMechanic = true;
              console.log(
                "Mecánico encontrado en la lista de mecánicos del jefe"
              );
            } else {
              console.log(
                "Mecánico NO encontrado en la lista de mecánicos del jefe"
              );
            }
          }
        } else {
          console.log(
            "El usuario objetivo no es un mecánico o no tiene datos de mecánico"
          );
        }
      } else {
        console.log("Usuario autenticado NO es jefe o no tiene datos de jefe");
        console.log(
          "Role ID:",
          req.user.roleId,
          "Tiene boss data:",
          !!req.user.boss
        );
      }

      console.log(
        "Resultado de verificación - isBossOfMechanic:",
        isBossOfMechanic
      );

      if (!isAdmin && !isSelf && !isBossOfMechanic) {
        console.log(
          "Acceso denegado para eliminación - isAdmin:",
          isAdmin,
          "isSelf:",
          isSelf,
          "isBossOfMechanic:",
          isBossOfMechanic
        );
        return res.status(403).json({
          success: false,
          message:
            "Acceso denegado. No puedes eliminar el perfil de otros usuarios.",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      const newActiveState = !existingUser.active;
      await prisma.user.update({
        where: { id: parseInt(id) },
        data: { active: newActiveState },
      });

      res.json({
        success: true,
        message: `Usuario ${
          newActiveState ? "activado" : "desactivado"
        } correctamente`,
      });
    } catch (error) {
      console.error("Error al desactivar usuario:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

router.get("/role/:roleId", requireRole("admin"), async (req, res) => {
  try {
    const { roleId } = req.params;

    const users = await prisma.user.findMany({
      where: {
        roleId: parseInt(roleId),
        active: true,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        cuil: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error al obtener usuarios por rol:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
});

router.get(
  "/mechanics/list",
  requireRole("admin", "jefe", "recepcionista", "cliente"),
  async (req, res) => {
    try {
      const mechanics = await prisma.mechanic.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              phone: true,
              active: true,
            },
          },
        },
        where: {
          user: {
            active: true,
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      });
      const mechanicsWithBoss = mechanics.map((m) => ({
        ...m,
        bossId: m.bossId || null,
      }));
      res.json({
        success: true,
        data: mechanicsWithBoss,
      });
    } catch (error) {
      console.error("Error al obtener mecánicos:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

router.get(
  "/bosses/list",
  requireRole("admin", "recepcionista"),
  async (req, res) => {
    try {
      const bosses = await prisma.boss.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              phone: true,
              active: true,
            },
          },
          mechanics: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                  email: true,
                  active: true,
                },
              },
            },
          },
        },
        where: { user: { active: true } },
        orderBy: { user: { name: "asc" } },
      });
      res.json({ success: true, data: bosses });
    } catch (error) {
      console.error("Error al obtener jefes:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }
);

router.put(
  "/mechanics/:mechanicId/assign-boss",
  requireRole("admin", "jefe"),
  [body("bossId").isInt({ min: 1 }), handleValidationErrors],
  async (req, res) => {
    try {
      const { mechanicId } = req.params;
      const { bossId } = req.body;

      if (req.user.role === "jefe" && req.user.boss?.id !== parseInt(bossId)) {
        return res.status(403).json({
          success: false,
          message:
            "Acceso denegado. Solo puedes asignar jefes a tus propios mecánicos.",
        });
      }

      const mech = await prisma.mechanic.findUnique({
        where: { id: parseInt(mechanicId) },
      });
      if (!mech)
        return res
          .status(404)
          .json({ success: false, message: "Mecánico no encontrado" });

      const boss = await prisma.boss.findUnique({
        where: { id: parseInt(bossId) },
      });
      if (!boss)
        return res
          .status(404)
          .json({ success: false, message: "Jefe no encontrado" });

      const updated = await prisma.mechanic.update({
        where: { id: parseInt(mechanicId) },
        data: { bossId: parseInt(bossId) },
        include: { user: true, boss: { include: { user: true } } },
      });
      res.json({ success: true, message: "Jefe asignado", data: updated });
    } catch (error) {
      console.error("Error al asignar jefe:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }
);

router.get(
  "/clients/list",
  requireRole("admin", "recepcionista"),
  async (req, res) => {
    try {
      const clients = await prisma.client.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              phone: true,
              cuil: true,
              active: true,
            },
          },
        },
        where: {
          user: {
            active: true,
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      });

      res.json({
        success: true,
        data: clients,
      });
    } catch (error) {
      console.error("Error al obtener clientes:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
);

module.exports = router;
