import { config, parse } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
export const serverDir = path.resolve(e2eDir, "..", "..", "server");

config({ path: path.join(serverDir, ".env"), quiet: true });

export const DEFAULT_TEST_DB_NAME = "helpdesk_test";

export function getTestDatabaseName(): string {
  return process.env.E2E_TEST_DB_NAME ?? DEFAULT_TEST_DB_NAME;
}

function readEnvTestDatabaseUrl(): string | undefined {
  const envTestPath = path.join(serverDir, ".env.test");
  if (!existsSync(envTestPath)) {
    return undefined;
  }

  const url = parse(readFileSync(envTestPath)).DATABASE_URL;
  return typeof url === "string" && url.length > 0 ? url : undefined;
}

export function getTestDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }

  const fromEnvTest = readEnvTestDatabaseUrl();
  if (fromEnvTest) {
    return fromEnvTest;
  }

  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in server/.env or set TEST_DATABASE_URL.",
    );
  }

  const url = new URL(baseUrl);
  url.pathname = `/${getTestDatabaseName()}`;
  return url.toString();
}

export function getAdminDatabaseUrl(testDatabaseUrl: string): string {
  const url = new URL(testDatabaseUrl);
  url.pathname = "/postgres";
  url.search = "";
  return url.toString();
}
