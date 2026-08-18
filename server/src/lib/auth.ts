import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import  prisma  from "../db.ts";

export const auth = betterAuth({
  appName: "Helpdesk",
  basePathL:"/api/auth",
  emailAndPassword: {
    enabled: true,
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
});

