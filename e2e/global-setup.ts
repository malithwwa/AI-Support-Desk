import { execSync } from "child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Pool } from "pg";
import { getAdminDatabaseUrl, getTestDatabaseName } from "./lib/test-db";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, "..", "server");
const envTestPath = path.join(serverDir, ".env.test");

function sameDatabase(a: string, b: string): boolean {
  try {
    return (
      decodeURIComponent(new URL(a).pathname) ===
      decodeURIComponent(new URL(b).pathname)
    );
  } catch {
    return false;
  }
}

function loadTestEnv(): { parsed: Record<string, string>; databaseUrl: string } {
  if (!existsSync(envTestPath)) {
    throw new Error(
      `Missing ${envTestPath}. Define DATABASE_URL pointing at the ${getTestDatabaseName()} database.`,
    );
  }

  const parsed = dotenv.config({ path: envTestPath }).parsed ?? {};

  const databaseUrl = parsed.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(`${envTestPath} must define DATABASE_URL.`);
  }

  const envPath = path.join(serverDir, ".env");
  if (existsSync(envPath)) {
    const devUrl = dotenv.parse(readFileSync(envPath)).DATABASE_URL;
    if (typeof devUrl === "string" && sameDatabase(devUrl, databaseUrl)) {
      throw new Error(
        "Refusing to reset: .env.test DATABASE_URL points at the development database.",
      );
    }
  }

  return { parsed, databaseUrl };
}

async function createDatabaseIfMissing(databaseUrl: string): Promise<void> {
  const dbName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
  const pool = new Pool({
    connectionString: getAdminDatabaseUrl(databaseUrl),
    max: 1,
  });

  try {
    const existing = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName],
    );

    if (existing.rowCount === 0) {
      const safeName = dbName.replace(/"/g, '""');
      await pool.query(`CREATE DATABASE "${safeName}"`);
      console.log(`Created test database: ${dbName}`);
    }
  } finally {
    await pool.end();
  }
}

export default async function globalSetup(): Promise<void> {
  const { parsed, databaseUrl } = loadTestEnv();

  await createDatabaseIfMissing(databaseUrl);

  const execEnv = {
    ...process.env,
    ...parsed,
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "Yes",
  };

  console.log("Resetting test database...");

  execSync("bunx prisma migrate reset --force", {
    cwd: serverDir,
    stdio: "inherit",
    env: execEnv,
  });

  console.log("Running seed...");

  execSync("bun prisma/seed.ts", {
    cwd: serverDir,
    stdio: "inherit",
    env: execEnv,
  });

  console.log("Test database ready.");
}
