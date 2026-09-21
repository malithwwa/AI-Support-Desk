import { z } from "zod";

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