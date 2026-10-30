import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

function safeEqual(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function verifyMailgunSignature(
  payload: Record<string, unknown>,
  signingKey: string,
): boolean {
  const { signature, timestamp, token } = payload;

  if (
    typeof signature !== "string" ||
    typeof timestamp !== "string" ||
    typeof token !== "string"
  ) {
    return false;
  }

  const expected = createHmac("sha256", signingKey)
    .update(timestamp.concat(token))
    .digest("hex");

  return safeEqual(signature, expected);
}

/**
 * Authenticates inbound email webhooks.
 *
 * Mailgun requests are verified with the HMAC signature it sends
 * (`MAILGUN_SIGNING_KEY`). Everything else falls back to the shared
 * `WEBHOOK_SECRET` sent as `x-webhook-secret` or `?secret=`, which is how
 * SendGrid Inbound Parse (which does not sign requests) is configured.
 */
export const requireWebhookAuth: RequestHandler = (req, res, next) => {
  const payload = req.body;

  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    const hasMailgunSignature = typeof (payload as Record<string, unknown>).signature === "string";
    const signingKey = process.env.MAILGUN_SIGNING_KEY;

    if (hasMailgunSignature && signingKey) {
      if (!verifyMailgunSignature(payload as Record<string, unknown>, signingKey)) {
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }

      next();
      return;
    }
  }

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Webhook secret is not configured" });
    return;
  }

  const header = req.headers["x-webhook-secret"];
  const provided = Array.isArray(header) ? header[0] : header ?? req.query.secret;

  if (typeof provided !== "string" || !safeEqual(provided, secret)) {
    res.status(401).json({ error: "Invalid webhook secret" });
    return;
  }

  next();
};
