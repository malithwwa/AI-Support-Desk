import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import prisma from "../src/db.ts";
import { UserRole } from "../src/generated/prisma/client.ts";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in server/.env");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Admin user ${email} already exists.`);
    return;
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      id: userId,
      email,
      name: "Admin",
      emailVerified: true,
      role: UserRole.ADMIN,
      accounts: {
        create: {
          id: randomUUID(),
          providerId: "credential",
          accountId: userId,
          password: passwordHash,
        },
      },
    },
  });

  console.log(`Admin user created: ${email}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });