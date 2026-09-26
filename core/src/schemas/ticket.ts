import { z } from "zod";

export const ticketStatusSchema = z.enum(["OPEN", "RESOLVED", "CLOSED"]);

export const ticketCategorySchema = z.enum([
  "GENERAL_QUESTION",
  "TECHNICAL_QUESTION",
  "REFUND_REQUEST",
]);

export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export type TicketCategory = z.infer<typeof ticketCategorySchema>;

export const ticketCategoryFilterSchema = z.enum([
  "GENERAL_QUESTION",
  "TECHNICAL_QUESTION",
  "REFUND_REQUEST",
  "UNCATEGORIZED",
]);

export const listTicketsQuerySchema = z.object({
  sortBy: z
    .enum([
      "subject",
      "senderName",
      "senderEmail",
      "status",
      "category",
      "createdAt",
      "updatedAt",
    ])
    .default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  status: z.union([ticketStatusSchema, ticketStatusSchema.array()]).optional(),
  category: z
    .union([ticketCategoryFilterSchema, ticketCategoryFilterSchema.array()])
    .optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

export const inboundEmailSchema = z.object({
  from: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Invalid email address")
    .email("Invalid email address"),
  fromName: z.string().trim().min(1, "Sender name is required"),
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  bodyHtml: z.string().optional(),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;