import { OpenRouter } from "@openrouter/sdk";

const DEFAULT_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

const SYSTEM_PROMPT = `You improve replies written by customer support agents.
Rewrite the agent's draft reply so it is clear, professional, friendly, and concise.

Rules:
- Preserve the original meaning, intent, facts, names, and commitments.
- Do not invent information, policies, prices, or promises.
- Keep the same language as the draft.
- Use plain text only: no markdown, headings, or code fences.
- Address the customer by name when it is available.
- Return only the improved reply, with no preamble, explanation, or surrounding quotation marks.`;

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI reply polishing is not configured. Set OPENROUTER_API_KEY on the server.");
    this.name = "AiNotConfiguredError";
  }
}

export class AiRequestError extends Error {
  constructor(message = "Failed to polish reply") {
    super(message);
    this.name = "AiRequestError";
  }
}

let client: OpenRouter | null = null;

function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return null;
  }

  client ??= new OpenRouter({
    apiKey,
    appTitle: "Helpdesk",
    httpReferer: process.env.TRUSTED_ORIGIN ?? "http://localhost:5173",
    timeoutMs: 30_000,
  });

  return client;
}

interface PolishReplyInput {
  subject: string;
  senderName: string;
  ticketBody: string;
  draft: string;
}

export async function polishReply({
  subject,
  senderName,
  ticketBody,
  draft,
}: PolishReplyInput): Promise<string> {
  const openRouter = getClient();
  if (!openRouter) {
    throw new AiNotConfiguredError();
  }

  const result = await openRouter.chat.send({
    chatRequest: {
      model: process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
      temperature: 0.4,
      maxCompletionTokens: 1_500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Ticket subject: ${subject}
Customer name: ${senderName}

Customer message:
"""
${ticketBody}
"""

Agent's draft reply:
"""
${draft}
"""

Improved reply:`,
        },
      ],
    },
  });

  const content = result.choices[0]?.message.content;
  const text = typeof content === "string" ? content.trim() : "";

  if (!text) {
    throw new AiRequestError("The AI model returned an empty reply");
  }

  return text;
}
