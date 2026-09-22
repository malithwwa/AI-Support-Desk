import {
  expect,
  test as base,
  type APIRequestContext,
  type APIResponse,
} from "@playwright/test";
import { TicketDb } from "../lib/tickets";
import { inboundEmailPath, webhookSecret } from "../lib/webhook";

type WebhookFixtures = {
  /** Test-database access for asserting / cleaning up created tickets. */
  tickets: TicketDb;
};

const test = base.extend<WebhookFixtures>({
  tickets: async ({}, use) => {
    const db = new TicketDb();
    try {
      await use(db);
    } finally {
      await db.cleanup();
      await db.dispose();
    }
  },
});

/** Payload accepted by POST /api/webhooks/inbound-email (core/inboundEmailSchema). */
type InboundEmailPayload = {
  from: string;
  fromName: string;
  subject: string;
  body: string;
  bodyHtml?: string;
};

/** Overrides may change any payload field except bodyHtml (see helper below). */
type InboundEmailOverrides = Partial<Omit<InboundEmailPayload, "bodyHtml">>;

/** Ticket object the webhook returns (JSON-serialized Prisma row). */
type WebhookTicket = {
  id: number;
  subject: string;
  body: string;
  bodyHtml: string | null;
  status: string;
  category: string | null;
  senderName: string;
  senderEmail: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Sender email unique to one test; the suite's domain keeps cleanup scoped. */
function uniqueSenderEmail(tag: string): string {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@webhook-e2e.test`;
}

/**
 * Build a valid payload for `from`. `withBodyHtml=false` omits the optional
 * bodyHtml field, which the route then serializes as null.
 */
function inboundEmailPayload(
  from: string,
  overrides: InboundEmailOverrides = {},
  withBodyHtml = true,
): InboundEmailPayload {
  const payload: InboundEmailPayload = {
    from,
    fromName: "E2E Sender",
    subject: "Default e2e subject",
    body: "Default e2e body",
    ...overrides,
  };
  if (withBodyHtml) {
    payload.bodyHtml = "<p>Default e2e body</p>";
  }
  return payload;
}

/** POST the inbound-email webhook with the secret in the x-webhook-secret header. */
async function postInboundEmail(
  request: APIRequestContext,
  payload: InboundEmailPayload,
  secret: string = webhookSecret,
): Promise<APIResponse> {
  return request.post(inboundEmailPath, {
    headers: { "x-webhook-secret": secret },
    data: payload,
  });
}

async function ticketOf(response: APIResponse): Promise<WebhookTicket> {
  const body = (await response.json()) as { ticket: WebhookTicket };
  return body.ticket;
}

test.describe("POST /api/webhooks/inbound-email", () => {
  test("creates an OPEN ticket from a valid payload", async ({
    request,
    tickets,
  }) => {
    const sender = uniqueSenderEmail("create");
    tickets.trackSender(sender);
    const res = await postInboundEmail(
      request,
      inboundEmailPayload(sender.toUpperCase(), {
        fromName: "Jane Doe",
        subject: "Help with login",
        body: "I can't sign in to my account.",
      }),
    );
    expect(res.status()).toBe(201);

    const ticket = await ticketOf(res);
    expect(typeof ticket.id).toBe("number");
    // The schema lowercases/trims `from` before validation, so the stored
    // sender email is the normalized unique value, not the upper-cased input.
    expect(ticket).toMatchObject({
      subject: "Help with login",
      body: "I can't sign in to my account.",
      bodyHtml: "<p>Default e2e body</p>",
      status: "OPEN",
      category: null,
      senderName: "Jane Doe",
      senderEmail: sender,
      assignedToId: null,
    });
    // Timestamps must be ISO-8601 strings on the wire.
    expect(new Date(ticket.createdAt).toISOString()).toBe(ticket.createdAt);
    expect(new Date(ticket.updatedAt).toISOString()).toBe(ticket.updatedAt);

    // The same row must be persisted in the database.
    const row = await tickets.findForSender(sender, "Help with login");
    expect(row).not.toBeNull();
    expect(row).toMatchObject({
      id: ticket.id,
      subject: "Help with login",
      body: "I can't sign in to my account.",
      bodyHtml: "<p>Default e2e body</p>",
      status: "OPEN",
      category: null,
      senderName: "Jane Doe",
      senderEmail: sender,
      assignedToId: null,
    });
  });

  test("strips Re: and Fwd: prefixes from the subject", async ({
    request,
    tickets,
  }) => {
    const sender = uniqueSenderEmail("strip");
    tickets.trackSender(sender);
    const res = await postInboundEmail(
      request,
      inboundEmailPayload(sender, { subject: "Re: Fwd: Help with login" }),
    );
    expect(res.status()).toBe(201);

    const ticket = await ticketOf(res);
    expect(ticket.subject).toBe("Help with login");

    const row = await tickets.findForSender(sender, "Help with login");
    expect(row).not.toBeNull();
    expect(row!.subject).toBe("Help with login");
  });

  test("deduplicates an open ticket for the same sender and subject", async ({
    request,
    tickets,
  }) => {
    const sender = uniqueSenderEmail("dedup");
    tickets.trackSender(sender);

    const first = await postInboundEmail(
      request,
      inboundEmailPayload(sender, {
        subject: "Help with login",
        body: "first message",
      }),
    );
    expect(first.status()).toBe(201);
    const firstTicket = await ticketOf(first);

    const second = await postInboundEmail(
      request,
      inboundEmailPayload(sender, {
        fromName: "Renamed Sender", // different metadata must NOT create a ticket
        subject: "help with LOGIN", // case-insensitive match on the normalized subject
        body: "second message",
      }),
    );
    expect(second.status()).toBe(200);

    // The EXISTING ticket is returned untouched, not a fresh one.
    const secondTicket = await ticketOf(second);
    expect(secondTicket.id).toBe(firstTicket.id);
    expect(secondTicket.subject).toBe("Help with login");
    expect(secondTicket.body).toBe("first message");
    expect(secondTicket.senderName).toBe("E2E Sender");
    expect(await tickets.countForSender(sender)).toBe(1);
  });

  test("creates a new ticket when the same subject comes from a different sender", async ({
    request,
    tickets,
  }) => {
    const senderA = uniqueSenderEmail("sender-a");
    const senderB = uniqueSenderEmail("sender-b");
    tickets.trackSender(senderA);
    tickets.trackSender(senderB);

    const first = await postInboundEmail(
      request,
      inboundEmailPayload(senderA, { subject: "Billing question" }),
    );
    expect(first.status()).toBe(201);
    const firstTicket = await ticketOf(first);

    const second = await postInboundEmail(
      request,
      inboundEmailPayload(senderB, { subject: "Billing question" }),
    );
    expect(second.status()).toBe(201);
    const secondTicket = await ticketOf(second);

    expect(secondTicket.id).not.toBe(firstTicket.id);
    expect(await tickets.countForSender(senderA)).toBe(1);
    expect(await tickets.countForSender(senderB)).toBe(1);
  });

  test("creates a new ticket when the same sender writes a different subject", async ({
    request,
    tickets,
  }) => {
    const sender = uniqueSenderEmail("re-subject");
    tickets.trackSender(sender);

    const first = await postInboundEmail(
      request,
      inboundEmailPayload(sender, { subject: "Subject one" }),
    );
    expect(first.status()).toBe(201);
    const firstTicket = await ticketOf(first);

    // bodyHtml is omitted here to prove it serializes as null on the wire.
    const second = await postInboundEmail(
      request,
      inboundEmailPayload(sender, { subject: "Subject two" }, false),
    );
    expect(second.status()).toBe(201);
    const secondTicket = await ticketOf(second);

    expect(secondTicket.id).not.toBe(firstTicket.id);
    expect(secondTicket.bodyHtml).toBeNull();
    expect(await tickets.countForSender(sender)).toBe(2);
  });

  test("accepts the secret via the ?secret= query parameter", async ({
    request,
    tickets,
  }) => {
    const sender = uniqueSenderEmail("query-secret");
    tickets.trackSender(sender);
    const res = await request.post(`${inboundEmailPath}?secret=${webhookSecret}`, {
      data: inboundEmailPayload(sender),
    });
    expect(res.status()).toBe(201);

    const ticket = await ticketOf(res);
    expect(ticket.subject).toBe("Default e2e subject");
    expect(await tickets.countForSender(sender)).toBe(1);
  });

  test("rejects requests without a webhook secret", async ({ request }) => {
    const res = await request.post(inboundEmailPath, {
      data: inboundEmailPayload(uniqueSenderEmail("no-secret")),
    });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid webhook secret" });
  });

  test("rejects an invalid webhook secret", async ({ request }) => {
    const res = await postInboundEmail(
      request,
      inboundEmailPayload(uniqueSenderEmail("wrong-secret")),
      "wrong-secret",
    );
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid webhook secret" });
  });

  test("rejects a payload with an invalid sender email", async ({ request }) => {
    const res = await postInboundEmail(
      request,
      inboundEmailPayload("not-an-email", {
        fromName: "Jane",
        subject: "Hello",
        body: "Hello there",
      }),
    );
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid email address" });
  });

  test("rejects empty fromName, subject and body with the first issue message", async ({
    request,
  }) => {
    const cases: Array<[InboundEmailOverrides, string]> = [
      [{ fromName: "" }, "Sender name is required"],
      [{ subject: "" }, "Subject is required"],
      [{ body: "" }, "Body is required"],
    ];

    for (const [overrides, expectedError] of cases) {
      const res = await postInboundEmail(
        request,
        inboundEmailPayload(uniqueSenderEmail("invalid"), overrides),
      );
      expect(res.status()).toBe(400);
      expect(await res.json()).toEqual({ error: expectedError });
    }
  });
});