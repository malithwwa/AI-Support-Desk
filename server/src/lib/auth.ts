import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.ts';

export const auth = betterAuth({
  appName: 'Helpdesk',
  emailAndPassword: {
    enabled: true,
  },
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
});

export type Session = typeof auth.$Infer.Session;
