import { Router } from "express";
import { listTicketsQuerySchema } from "@helpdesk/core";
import prisma from "../db.ts";
import { Prisma } from "../generated/prisma/client.ts";
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

  const { sortBy, sortDir, status, category, search } = query.data;

  const statusList =
    typeof status === "string" ? [status] : (status ?? []);
  const categoryList =
    typeof category === "string" ? [category] : (category ?? []);

  const and: Prisma.TicketWhereInput[] = [];

  if (statusList.length) {
    and.push({ status: { in: statusList } });
  }

  if (categoryList.length) {
    const included = categoryList.filter((c) => c !== "UNCATEGORIZED");
    const hasUncategorized = categoryList.includes("UNCATEGORIZED");

    if (included.length && hasUncategorized) {
      and.push({
        OR: [
          { category: { in: included } },
          { category: null },
        ],
      });
    } else if (included.length) {
      and.push({ category: { in: included } });
    } else {
      and.push({ category: null });
    }
  }

  if (search) {
    and.push({
      OR: [
        { subject: { contains: search, mode: "insensitive" } },
        { senderName: { contains: search, mode: "insensitive" } },
        { senderEmail: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.TicketWhereInput | undefined =
    and.length > 0 ? { AND: and } : undefined;

  const tickets = await prisma.ticket.findMany({
    ...(where ? { where } : {}),
    orderBy: { [sortBy]: sortDir },
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