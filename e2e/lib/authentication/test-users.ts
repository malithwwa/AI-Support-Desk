import { config } from "dotenv";
import path from "node:path";
import { serverDir } from "../test-db";

config({ path: path.join(serverDir, ".env"), quiet: true });

export const clientOrigin = `http://localhost:${process.env.E2E_CLIENT_PORT ?? 5174}`;
export const apiOrigin = `http://localhost:${process.env.E2E_API_PORT ?? 3100}`;

export const adminEmail =
  process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? "";
export const adminPassword =
  process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "";

if (!adminEmail) {
  throw new Error(
    "Admin email not found. Set ADMIN_EMAIL in server/.env or E2E_ADMIN_EMAIL.",
  );
}

if (!adminPassword) {
  throw new Error(
    "Admin password not found. Set ADMIN_PASSWORD in server/.env or E2E_ADMIN_PASSWORD. It must never be hardcoded in specs.",
  );
}
