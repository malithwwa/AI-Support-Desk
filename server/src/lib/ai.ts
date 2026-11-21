import { OpenRouter } from "@openrouter/sdk";

const DEFAULT_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

const POLISH_SYSTEM_PROMPT = `You improve replies written by customer support agents.
Rewrite the agent's draft reply so it is clear, professional, friendly, and concise.

Rules:
- Preserve the original meaning, intent, facts, names, and commitments.
- Do not invent information, policies, prices, or promises.
- Keep the same language as the draft.
- Use plain text only: no markdown, headings, or code fences.
- Address the customer by name when it is available.
- Return only the improved reply, with no preamble, explanation, or surrounding quotation marks.`;

const SUMMARY_SYSTEM_PROMPT = `You summarize customer support tickets for support agents.
Summarize the original customer message together with the full conversation history.

Rules:
- Capture the main issue, key details, actions already taken, and the current status or next step when stated.
- Preserve names, dates, order numbers, and other concrete facts exactly as written.
- Do not invent information or speculate about unstated facts.
- Keep the same language as the conversation.
- Use plain text only: no markdown, headings, bullet symbols, or code fences.
- Be concise: aim for 3-5 short sentences.
- Return only the summary, with no preamble or explanation.`;

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI features are not configured. Set OPENROUTER_API_KEY on the server.");
    this.name = "AiNotConfiguredError";
  }
}

export class AiRequestError extends Error {
  constructor(message = "AI request failed") {
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

interface ChatInput {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxCompletionTokens: number;
}

async function sendChat({
  systemPrompt,
  userPrompt,
  temperature,
  maxCompletionTokens,
}: ChatInput): Promise<string> {
  const openRouter = getClient();
  if (!openRouter) {
    throw new AiNotConfiguredError();
  }

  const result = await openRouter.chat.send({
    chatRequest: {
      model: process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
      temperature,
      maxCompletionTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    },
  });

  const content = result.choices[0]?.message.content;
  const text = typeof content === "string" ? content.trim() : "";

  if (!text) {
    throw new AiRequestError("The AI model returned an empty response");
  }

  return text;
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
  return sendChat({
    systemPrompt: POLISH_SYSTEM_PROMPT,
    temperature: 0.4,
    maxCompletionTokens: 1_500,
    userPrompt: `Ticket subject: ${subject}
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
  });
}

interface ConversationMessage {
  senderType: string;
  author: string;
  sentAt: string;
  body: string;
}

interface SummarizeTicketInput {
  subject: string;
  status: string;
  category: string | null;
  senderName: string;
  senderEmail: string;
  ticketBody: string;
  messages: ConversationMessage[];
}

export async function summarizeTicket({
  subject,
  status,
  category,
  senderName,
  senderEmail,
  ticketBody,
  messages,
}: SummarizeTicketInput): Promise<string> {
  const history = messages.length
    ? messages
        .map(
          (message, index) =>
            `${index + 1}. [${message.senderType}] ${message.author} (${message.sentAt}):\n${message.body}`,
        )
        .join("\n\n")
    : "No replies yet.";

  return sendChat({
    systemPrompt: SUMMARY_SYSTEM_PROMPT,
    temperature: 0.2,
    maxCompletionTokens: 800,
    userPrompt: `Ticket subject: ${subject}
Status: ${status}
Category: ${category ?? "Uncategorized"}
Customer: ${senderName} <${senderEmail}>

Original message:
"""
${ticketBody}
"""

Conversation history:
${history}

Summary:`,
  });
}
