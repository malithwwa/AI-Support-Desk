import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Enter a valid email"),
  password: z.string().trim().min(8, "Password must be at least 8 characters"),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Enter a valid email"),
  password: z
    .union([
      z.string().trim().min(8, "Password must be at least 8 characters"),
      z.literal(""),
    ])
    .optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export type CreateUserInput = z.infer<typeof createUserSchema>;