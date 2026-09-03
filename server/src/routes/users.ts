import { Router } from "express";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { createUserSchema, updateUserSchema } from "@helpdesk/core";
import prisma from "../db.ts";
import { requireAuth } from "../middleware/require-auth.ts";
import { requireAdmin } from "../middleware/require-admin.ts";
import { apiLimiter } from "../middleware/rate-limit.ts";
import { UserRole } from "../generated/prisma/enums.ts";

const router = Router();

router.get("/me", apiLimiter, requireAuth, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ user: { id, name, email, role } });
});

// Express 5 auto-catches rejected promises from async handlers to custom(if implemented)/ in-Built error handler
// No try/catch needed.
router.get("/users", apiLimiter, requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  res.json({ users });
});

router.post("/users", apiLimiter, requireAuth, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "A user with this email already exists" });
    return;
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      id: userId,
      email,
      name,
      emailVerified: true,
      role: UserRole.AGENT,
      accounts: {
        create: {
          id: randomUUID(),
          providerId: "credential",
          accountId: userId,
          password: passwordHash,
          // Better Auth >=1.7 requires this on credential accounts;
          // sign-in rejects users without it ("local:<providerId>").
          issuer: "local:credential",
        },
      },
    },
  });

  res.status(201).json({
    user: {
      id: userId,
      name,
      email,
      role: UserRole.AGENT,
      createdAt: new Date().toISOString(),
    },
  });
});

router.patch("/users/:id", apiLimiter, requireAuth, requireAdmin, async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { id } = req.params as { id: string };
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (email !== existing.email) {
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }
  }

  let passwordHash: string | null = null;
  if (password) {
    passwordHash = await hashPassword(password);
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
    },
  });

  if (passwordHash) {
    await prisma.account.updateMany({
      where: { userId: id, providerId: "credential" },
      data: { password: passwordHash },
    });
  }

  res.json({
    user: {
      id,
      name,
      email,
      role: existing.role,
      createdAt: existing.createdAt.toISOString(),
    },
  });
});

export default router;