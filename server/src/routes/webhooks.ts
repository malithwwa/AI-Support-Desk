import { Router, type RequestHandler } from "express";
import multer, { type StorageEngine } from "multer";
import { inboundEmailSchema } from "@helpdesk/core";
import { requireWebhookAuth } from "../middleware/require-webhook-auth.ts";
import { parseInboundEmail } from "../lib/inbound-email.ts";
import { validate } from "../lib/validate.ts";
import prisma from "../db.ts";

function stripSubjectPrefixes(subject: string): string {
  return subject.replace(/^(Re:\s*|Fwd:\s*)+/i, "").trim();
}

/**
 * Attachments are not stored with tickets, so discard their bytes instead of
 * buffering potentially large uploads in memory. The fields (from, subject,
 * body, ...) are still parsed into `req.body` by multer.
 */
const discardFiles: StorageEngine = {
  _handleFile(_req, file, callback) {
    file.stream.on("error", (error) => callback(error));
    file.stream.resume();
    file.stream.on("end", () => callback(null, {}));
  },
  _removeFile(_req, _file, callback) {
    callback(null);
  },
};

const receiveEmail = multer({
  storage: discardFiles,
  limits: {
    // A plain-text field (including SendGrid's raw `email`) is capped by
    // fieldSize; 2 MB comfortably covers common support emails.
    fieldSize: 2 * 1024 * 1024,
    fields: 60,
    files: 20,
    parts: 200,
  },
}).any();

const parseMultipart: RequestHandler = (req, res, next) => {
  receiveEmail(req, res, (error) => {
    if (error) {
      const limitReached =
        error instanceof multer.MulterError &&
        [
          "LIMIT_FILE_SIZE",
          "LIMIT_FIELD_VALUE",
          "LIMIT_FILE_COUNT",
          "LIMIT_FIELD_COUNT",
          "LIMIT_PART_COUNT",
        ].includes(error.code);

      res.status(400).json({
        error: limitReached
          ? "Email payload exceeds the size or part limits"
          : "Invalid multipart payload",
      });
      return;
    }

    next();
  });
};

const router = Router();

router.post("/inbound-email", parseMultipart, requireWebhookAuth, async (req, res) => {
  const candidate = parseInboundEmail(req.body);
  const data = validate(inboundEmailSchema, candidate, res);
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
