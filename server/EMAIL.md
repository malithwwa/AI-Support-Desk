# Inbound Email

Support email sent to the support address is converted into a ticket by
`POST /api/webhooks/inbound-email` (`server/src/routes/webhooks.ts`).

## How it works

1. The email provider receives mail for the support address and POSTs it to the
   webhook (usually `multipart/form-data`).
2. `parseInboundEmail` (`server/src/lib/inbound-email.ts`) normalizes the
   provider payload to the canonical `inboundEmailSchema` shape:
   - Mailgun: `from`, `subject`, `stripped-text`/`body-plain`, `body-html`
   - SendGrid: `from`, `subject`, `text`, `html`
   - Plain JSON in the canonical shape is also accepted (used by tests/curl).
3. `requireWebhookAuth` authenticates the request (Mailgun signature or shared
   secret, see below).
4. The ticket is created as `OPEN`, uncategorized and unassigned. `Re:`/`Fwd:`
   prefixes are stripped from the subject. If an **OPEN** ticket already exists
   for the same sender and normalized subject, that ticket is returned instead
   of creating a duplicate.

Attachments are not stored. HTML-only emails are converted to plain text for
`body` while the original HTML is kept in `bodyHtml`.

## Mailgun

1. Add an inbound route in Mailgun (Receiving → Routes) for the support
   address, for example:
   - Expression: `match_recipient("support@yourdomain.com")`
   - Action: `forward("https://your-api-host/api/webhooks/inbound-email")`
2. Set `MAILGUN_SIGNING_KEY` in `server/.env` to the webhook signing key
   (Settings → Webhooks / API keys). Mailgun signs every request with
   HMAC-SHA256; requests with a missing or invalid signature are rejected.
3. The sandbox domain works for local development without owning a domain.

`WEBHOOK_SECRET` does not need to be set when Mailgun signatures are verified.

## SendGrid

1. Configure the MX record for your receiving domain as described in
   SendGrid's Inbound Parse setup.
2. Add an Inbound Parse host for the domain with the destination URL:
   `https://your-api-host/api/webhooks/inbound-email?secret=<WEBHOOK_SECRET>`
3. Set `WEBHOOK_SECRET` in `server/.env`. SendGrid does not sign inbound
   requests, so the secret is the only authentication.

## Local development

Providers need a public URL. Use a tunnel (e.g. `ngrok http 3000` or
`cloudflared tunnel --url http://localhost:3000`) and use the tunnel URL when
configuring the route/parse host. Then send an email to the support address and
it should appear in the ticket list.

You can also exercise the webhook directly (canonical JSON contract):

```bash
curl -X POST http://localhost:3000/api/webhooks/inbound-email \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $WEBHOOK_SECRET" \
  -d '{"from":"jane@example.com","fromName":"Jane Doe","subject":"Help with login","body":"I cannot sign in."}'
```

## Security notes

- Mailgun requests are verified via the HMAC signature; do not configure a
  route without `MAILGUN_SIGNING_KEY` in production.
- SendGrid requests rely on an unguessable `WEBHOOK_SECRET`; treat the
  destination URL as a credential.
- Multipart parsing discards attachment bytes, caps text fields at 2 MB and
  accepts at most 20 files/60 fields per request.

## Not implemented (yet)

- Storing customer follow-up emails as ticket replies. A follow-up that matches
  an open ticket returns that ticket without adding the new message.
- Threading on `Message-Id`/`In-Reply-To` (current matching is sender +
  normalized subject).
- Sending agent replies back to the customer by email.
