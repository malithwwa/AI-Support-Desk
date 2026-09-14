import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import prisma from "../db.ts";

export const trustedOrigin = process.env.TRUSTED_ORIGIN ?? "http://localhost:5173";

export const auth = betterAuth({
  appName: "Helpdesk",
  trustedOrigins: [trustedOrigin],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
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
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { deletedAt: true },
          });
          if (user?.deletedAt) {
            throw APIError.from("FORBIDDEN", {
              message: "This account has been deleted",
              code: "ACCOUNT_DELETED",
            });
          }
        },
      },
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
});

