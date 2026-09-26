import { Router } from "express";
import { listTicketsQuerySchema } from "@helpdesk/core";
import prisma from "../db.ts";
import { requireAuth } from "../middleware/require-auth.ts";
import { apiLimiter } from "../middleware/rate-limit.ts";

const router = Router();

router.get("/tickets", apiLimiter, requireAuth, async (req, res) => {
  const query = listTicketsQuerySchema.safeParse(req.query);
  if (!query.success) {
    return res
      .status(400)
      .json({ error: query.error.issues[0]?.message ?? "Invalid query" });
  }

  const tickets = await prisma.ticket.findMany({
    orderBy: { [query.data.sortBy]: query.data.sortDir },
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