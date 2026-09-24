import { Router } from "express";
import prisma from "../db.ts";
import { requireAuth } from "../middleware/require-auth.ts";
import { apiLimiter } from "../middleware/rate-limit.ts";

const router = Router();

router.get("/tickets", apiLimiter, requireAuth, async (_req, res) => {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      subject: true,
      body: true,
      bodyHtml: true,
      status: true,
      category: true,
      senderName: true,
      senderEmail: true,
      assignedToId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json({ tickets });
});

export default router;