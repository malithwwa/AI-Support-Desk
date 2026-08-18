import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import  prisma  from "../db.ts";

export const auth = betterAuth({
  appName: "Helpdesk",
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
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
});

