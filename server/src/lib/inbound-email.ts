/**
 * Normalizes inbound email payloads from the supported email providers
 * (Mailgun routes and SendGrid Inbound Parse) into the canonical shape
 * accepted by `inboundEmailSchema`.
 *
 * Both providers POST `multipart/form-data` with different field names:
 * - Mailgun:  `from`, `subject`, `stripped-text`/`body-plain`, `body-html`
 * - SendGrid: `from`, `subject`, `text`, `html`
 *
 * Mailgun's `from` header can be `"Bob Lee blee@example.com"` (no angle
 * brackets), while SendGrid sends `"Bob Lee <blee@example.com>"`; both are
 * handled by `parseEmailAddress`.
 */

type Payload = Record<string, unknown>;

const EMAIL_PATTERN = /[^\s<>()",;:]+@[^\s<>()",;:]+/;

function isRecord(value: unknown): value is Payload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** First non-blank string, flattening one level of arrays (Mailgun's `body-html`). */
function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim() !== "") {
          return item.trim();
        }
      }
    }
  }

  return undefined;
}

/** Splits a `From` header into an email address and an optional display name. */
export function parseEmailAddress(raw: string): { email: string; name?: string } {
  const value = raw.trim().replace(/^mailto:/i, "");

  const bracketed = value.match(/^(.*)<([^>]+)>\s*$/);
  if (bracketed) {
    const [, rawName = "", rawEmail = value] = bracketed;
    const email = rawEmail.trim();
    const name = rawName.trim().replace(/^["']+|["']+$/g, "").trim();
    return name ? { email, name } : { email };
  }

  const match = value.match(EMAIL_PATTERN);
  if (!match) {
    return { email: value };
  }

  const email = match[0];
  const name = value
    .replace(email, "")
    .replace(/^["'(]+|["'),]+$/g, "")
    .trim();

  return name ? { email, name } : { email };
}

/** Converts an HTML email body into readable plain text (HTML-only emails). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Returns a candidate for `inboundEmailSchema` to validate.
 *
 * The canonical JSON contract (`from`, `fromName`, `subject`, `body`,
 * `bodyHtml`) is passed through untouched so validation errors stay stable.
 * Provider payloads get sensible fallbacks: the display name falls back to
 * the email's local part, a missing subject becomes `(no subject)`, and a
 * missing text part is derived from the HTML part.
 */
export function parseInboundEmail(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) {
    return {};
  }

  if (typeof payload.body === "string" && typeof payload.fromName === "string") {
    return {
      from: payload.from,
      fromName: payload.fromName,
      subject: payload.subject,
      body: payload.body,
      bodyHtml: payload.bodyHtml,
    };
  }

  const rawFrom = firstNonEmptyString(payload.from, payload.sender) ?? "";
  const { email, name } = parseEmailAddress(rawFrom);

  const explicitName = firstNonEmptyString(payload.fromName);
  const fromName = explicitName ?? name ?? email.split("@")[0] ?? email;

  const subject = firstNonEmptyString(payload.subject) ?? "(no subject)";

  const bodyHtml = firstNonEmptyString(
    payload["stripped-html"],
    payload.bodyHtml,
    payload.html,
    payload["body-html"],
  );

  const text = firstNonEmptyString(
    payload["stripped-text"],
    payload.text,
    payload.body,
    payload["body-plain"],
  );

  const body = text ?? (bodyHtml ? htmlToText(bodyHtml) : undefined) ?? "(no message body)";

  const candidate: Record<string, unknown> = {
    from: email,
    fromName,
    subject,
    body,
  };

  if (bodyHtml) {
    candidate.bodyHtml = bodyHtml;
  }

  return candidate;
}
