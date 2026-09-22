import { parse } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { serverDir } from "./test-db";

const envTestPath = path.join(serverDir, ".env.test");

/**
 * The shared secret protecting POST /api/webhooks/inbound-email.
 *
 * `requireWebhookSecret` (server/src/middleware/require-webhook-secret.ts)
 * compares the `x-webhook-secret` header or `?secret=` query param against
 * `process.env.WEBHOOK_SECRET` with a plain `!==`, so specs must send exactly
 * the value the API was started with. The API webServer gets the secret
 * injected explicitly in e2e/playwright.config.ts (rather than relying on
 * Bun's NODE_ENV=test .env.test auto-load) so the route never falls into the
 * unconfigured 500 branch.
 *
 * Read from server/.env.test here so the spec and the webServer config always
 * agree. Failing fast at load time (instead of with confusing 401s) is
 * intentional.
 */
export const webhookSecret: string = (() => {
  if (!existsSync(envTestPath)) {
    throw new Error(
      `Missing ${envTestPath}. It must define WEBHOOK_SECRET for the webhook e2e tests.`,
    );
  }
  const secret = parse(readFileSync(envTestPath)).WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(`${envTestPath} must define WEBHOOK_SECRET.`);
  }
  return secret;
})();

/** Route the webhook is mounted at (server/src/index.ts mounts it under /api/webhooks). */
export const inboundEmailPath = "/api/webhooks/inbound-email";