import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "../db.ts";

export const trustedOrigin = process.env.TRUSTED_ORIGIN ?? "http://localhost:5173";

export const auth = betterAuth({
  appName: "Helpdesk",
  trustedOrigins: [trustedOrigin],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "AGENT",
        input: false,
      },
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
});

