import { Router } from "express";
import {
  createTicketReplySchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
  updateTicketSchema,
} from "@helpdesk/core";
import prisma from "../db.ts";
import { Prisma } from "../generated/prisma/client.ts";
import { requireAuth } from "../middleware/require-auth.ts";
import { requireAdmin } from "../middleware/require-admin.ts";
import { apiLimiter } from "../middleware/rate-limit.ts";

const router = Router();

const ticketSelect = {
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
} as const;

const replyInclude = {
  user: {
    select: { id: true, name: true, email: true },
  },
} as const;

const ticketInclude = {
  assignedTo: {
    select: { id: true, name: true, email: true },
  },
  replies: {
    orderBy: { createdAt: "asc" },
    include: replyInclude,
  },
} as const;

router.get("/tickets", apiLimiter, requireAuth, async (req, res) => {
  const query = listTicketsQuerySchema.safeParse(req.query);
  if (!query.success) {
    return res
      .status(400)
      .json({ error: query.error.issues[0]?.message ?? "Invalid query" });
  }

  const { sortBy, sortDir, status, category, search, page, pageSize } =
    query.data;

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

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      ...(where ? { where } : {}),
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: ticketSelect,
    }),
    prisma.ticket.count({ ...(where ? { where } : {}) }),
  ]);

  res.json({
    tickets,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

router.get("/tickets/:id", apiLimiter, requireAuth, async (req, res) => {
  const params = ticketIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return res
      .status(400)
      .json({ error: params.error.issues[0]?.message ?? "Invalid ticket id" });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.data.id },
    include: ticketInclude,
  });

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  res.json({ ticket });
});

router.post(
  "/tickets/:id/replies",
  apiLimiter,
  requireAuth,
  async (req, res) => {
    const params = ticketIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res
        .status(400)
        .json({ error: params.error.issues[0]?.message ?? "Invalid ticket id" });
    }

    const body = createTicketReplySchema.safeParse(req.body);
    if (!body.success) {
      return res
        .status(400)
        .json({ error: body.error.issues[0]?.message ?? "Invalid reply" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.data.id },
      select: { id: true },
    });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const [, reply] = await prisma.$transaction([
      prisma.reply.create({
        data: {
          ticketId: ticket.id,
          userId: req.user.id,
          // Replies posted through the API come from signed-in staff;
          // customer replies arrive via the inbound-email webhook.
          senderType: "AGENT",
          body: body.data.body,
        },
        include: replyInclude,
      }),
      // Bump the ticket's updatedAt so it reflects the new activity.
      prisma.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    res.status(201).json({ reply });
  },
);

router.patch(
  "/tickets/:id",
  apiLimiter,
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const params = ticketIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res
        .status(400)
        .json({ error: params.error.issues[0]?.message ?? "Invalid ticket id" });
    }

    const body = updateTicketSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: body.error.flatten().fieldErrors,
      });
    }

    const { assignedToId, status, category } = body.data;

    const existing = await prisma.ticket.findUnique({
      where: { id: params.data.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (assignedToId !== undefined && assignedToId !== null) {
      const assignee = await prisma.user.findFirst({
        where: { id: assignedToId, deletedAt: null },
        select: { id: true },
      });
      if (!assignee) {
        return res.status(400).json({ error: "Assignee not found" });
      }
    }

    const data: Prisma.TicketUncheckedUpdateInput = {};
    if (assignedToId !== undefined) data.assignedToId = assignedToId;
    if (status !== undefined) data.status = status;
    if (category !== undefined) data.category = category;

    const ticket = await prisma.ticket.update({
      where: { id: params.data.id },
      data,
      include: ticketInclude,
    });

    res.json({ ticket });
  },
);

export default router;
