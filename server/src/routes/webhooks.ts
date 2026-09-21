import { Router } from "express";
import { inboundEmailSchema } from "@helpdesk/core";
import { requireWebhookSecret } from "../middleware/require-webhook-secret.ts";
import { validate } from "../lib/validate.ts";
import prisma from "../db.ts";

function stripSubjectPrefixes(subject: string): string {
  return subject.replace(/^(Re:\s*|Fwd:\s*)+/i, "").trim();
}

const router = Router();

router.post("/inbound-email", requireWebhookSecret, async (req, res) => {
  const data = validate(inboundEmailSchema, req.body, res);
  if (!data) return;

  const normalizedSubject = stripSubjectPrefixes(data.subject);

  // Check for existing open ticket from same sender with matching subject
  const existingTicket = await prisma.ticket.findFirst({
    where: {
      senderEmail: data.from,
      status: "OPEN",
      subject: { equals: normalizedSubject, mode: "insensitive" },
    },
  });

  if (existingTicket) {
    res.status(200).json({ ticket: existingTicket });
    return;
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject: normalizedSubject,
      body: data.body,
      bodyHtml: data.bodyHtml ?? null,
      senderName: data.fromName,
      senderEmail: data.from,
    },
  });

  res.status(201).json({ ticket });
});

export default router;